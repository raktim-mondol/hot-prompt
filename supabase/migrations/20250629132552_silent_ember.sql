/*
  # Fix User Creation Database Error

  1. Issues Fixed
    - Fix the user creation trigger function
    - Ensure proper error handling in database functions
    - Add better logging for debugging
    - Handle edge cases in user record creation

  2. Changes
    - Update initialize_user_usage function with better error handling
    - Add function to manually create user records if trigger fails
    - Improve RLS policies to handle edge cases
*/

-- Drop existing trigger to recreate it properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the user initialization function with better error handling
CREATE OR REPLACE FUNCTION initialize_user_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the user creation attempt
  RAISE NOTICE 'Initializing records for user: %', NEW.id;
  
  BEGIN
    -- Insert usage record with explicit error handling
    INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
    VALUES (
      NEW.id,
      0,
      3, -- Free tier: 3 prompts
      now() + interval '1 month'
    );
    
    RAISE NOTICE 'Created usage record for user: %', NEW.id;
  EXCEPTION 
    WHEN unique_violation THEN
      RAISE NOTICE 'Usage record already exists for user: %', NEW.id;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create usage record for user %: %', NEW.id, SQLERRM;
  END;
  
  BEGIN
    -- Insert subscription record with explicit error handling
    INSERT INTO user_subscriptions (user_id, plan_type, status)
    VALUES (
      NEW.id,
      'free',
      'active'
    );
    
    RAISE NOTICE 'Created subscription record for user: %', NEW.id;
  EXCEPTION 
    WHEN unique_violation THEN
      RAISE NOTICE 'Subscription record already exists for user: %', NEW.id;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create subscription record for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE WARNING 'Error in initialize_user_usage for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_usage();

-- Function to manually create user records (fallback)
CREATE OR REPLACE FUNCTION create_user_records_manually(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Create usage record if it doesn't exist
  INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
  VALUES (user_uuid, 0, 3, now() + interval '1 month')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create subscription record if it doesn't exist
  INSERT INTO user_subscriptions (user_id, plan_type, status)
  VALUES (user_uuid, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user records manually for %: %', user_uuid, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improved ensure_user_records function
CREATE OR REPLACE FUNCTION ensure_user_records(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  usage_exists boolean := false;
  subscription_exists boolean := false;
BEGIN
  -- Check if usage record exists
  SELECT EXISTS(SELECT 1 FROM user_usage WHERE user_id = user_uuid) INTO usage_exists;
  
  -- Check if subscription record exists
  SELECT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id = user_uuid) INTO subscription_exists;
  
  -- Create missing records
  IF NOT usage_exists THEN
    INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
    VALUES (user_uuid, 0, 3, now() + interval '1 month')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  IF NOT subscription_exists THEN
    INSERT INTO user_subscriptions (user_id, plan_type, status)
    VALUES (user_uuid, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error ensuring user records for %: %', user_uuid, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_user_records_manually(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_records(uuid) TO authenticated;

-- Add RLS policy to allow users to insert their own records (fallback)
CREATE POLICY "Users can insert own usage record"
  ON user_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription record"
  ON user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to check and fix user records on sign in
CREATE OR REPLACE FUNCTION check_and_fix_user_records(user_uuid uuid)
RETURNS json AS $$
DECLARE
  usage_record user_usage%ROWTYPE;
  subscription_record user_subscriptions%ROWTYPE;
  result json;
BEGIN
  -- Get existing records
  SELECT * INTO usage_record FROM user_usage WHERE user_id = user_uuid;
  SELECT * INTO subscription_record FROM user_subscriptions WHERE user_id = user_uuid;
  
  -- If records don't exist, create them
  IF usage_record IS NULL OR subscription_record IS NULL THEN
    PERFORM ensure_user_records(user_uuid);
    
    -- Fetch the records again
    SELECT * INTO usage_record FROM user_usage WHERE user_id = user_uuid;
    SELECT * INTO subscription_record FROM user_subscriptions WHERE user_id = user_uuid;
  END IF;
  
  -- Return the records as JSON
  result := json_build_object(
    'usage', row_to_json(usage_record),
    'subscription', row_to_json(subscription_record),
    'success', true
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_and_fix_user_records(uuid) TO authenticated;
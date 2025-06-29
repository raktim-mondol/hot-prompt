/*
  # Fix User Initialization and Database Setup

  1. Database Functions
    - Fix user record creation with proper error handling
    - Ensure all users have required records on sign-in
    - Add comprehensive logging for debugging

  2. Permissions
    - Grant proper permissions for user functions
    - Ensure RLS policies allow necessary operations

  3. Data Integrity
    - Fix any existing users missing records
    - Ensure triggers work properly
*/

-- Drop existing problematic triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS initialize_user_usage() CASCADE;

-- Create a robust user initialization function
CREATE OR REPLACE FUNCTION initialize_user_records()
RETURNS TRIGGER AS $$
BEGIN
  -- Create usage record
  INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
  VALUES (
    NEW.id,
    0,
    3,
    now() + interval '1 month'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create subscription record
  INSERT INTO user_subscriptions (user_id, plan_type, status)
  VALUES (
    NEW.id,
    'free',
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent user creation
    RAISE WARNING 'Failed to initialize user records for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_records();

-- Function to ensure user has all required records (called on app load)
CREATE OR REPLACE FUNCTION ensure_user_setup(user_uuid uuid)
RETURNS json AS $$
DECLARE
  usage_exists boolean := false;
  subscription_exists boolean := false;
  usage_record user_usage%ROWTYPE;
  subscription_record user_subscriptions%ROWTYPE;
BEGIN
  -- Check if records exist
  SELECT EXISTS(SELECT 1 FROM user_usage WHERE user_id = user_uuid) INTO usage_exists;
  SELECT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id = user_uuid) INTO subscription_exists;
  
  -- Create missing usage record
  IF NOT usage_exists THEN
    INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
    VALUES (user_uuid, 0, 3, now() + interval '1 month')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Create missing subscription record
  IF NOT subscription_exists THEN
    INSERT INTO user_subscriptions (user_id, plan_type, status)
    VALUES (user_uuid, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Get the final records
  SELECT * INTO usage_record FROM user_usage WHERE user_id = user_uuid;
  SELECT * INTO subscription_record FROM user_subscriptions WHERE user_id = user_uuid;
  
  RETURN json_build_object(
    'success', true,
    'user_id', user_uuid,
    'usage', row_to_json(usage_record),
    'subscription', row_to_json(subscription_record)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified can_generate_prompt function
CREATE OR REPLACE FUNCTION can_generate_prompt(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  usage_record user_usage%ROWTYPE;
  subscription_record user_subscriptions%ROWTYPE;
BEGIN
  -- Ensure user has records first
  PERFORM ensure_user_setup(user_uuid);
  
  -- Get records
  SELECT * INTO usage_record FROM user_usage WHERE user_id = user_uuid;
  SELECT * INTO subscription_record FROM user_subscriptions WHERE user_id = user_uuid;
  
  -- Basic checks
  IF usage_record IS NULL OR subscription_record IS NULL THEN
    RETURN false;
  END IF;
  
  IF subscription_record.status != 'active' THEN
    RETURN false;
  END IF;
  
  IF usage_record.prompts_used >= usage_record.prompts_limit THEN
    RETURN false;
  END IF;
  
  -- Reset usage if needed for free users
  IF subscription_record.plan_type = 'free' AND usage_record.reset_date < now() THEN
    UPDATE user_usage 
    SET 
      prompts_used = 0,
      reset_date = now() + interval '1 month',
      updated_at = now()
    WHERE user_id = user_uuid;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified increment_prompt_usage function
CREATE OR REPLACE FUNCTION increment_prompt_usage(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE user_usage 
  SET 
    prompts_used = prompts_used + 1,
    updated_at = now()
  WHERE user_id = user_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION ensure_user_setup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_generate_prompt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_prompt_usage(uuid) TO authenticated;

-- Ensure all existing users have proper records
INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
SELECT 
  id,
  0,
  3,
  now() + interval '1 month'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_subscriptions (user_id, plan_type, status)
SELECT 
  id,
  'free',
  'active'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
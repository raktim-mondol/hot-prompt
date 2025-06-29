/*
  # Fix Database and Stripe Integration Issues

  1. Database Functions
    - Improve error handling in user record creation
    - Add better logging and fallback mechanisms
    - Ensure proper RLS policies

  2. Stripe Integration
    - Fix payment processing functions
    - Ensure proper customer and order handling
    - Add better error recovery

  3. User Management
    - Robust user record initialization
    - Automatic record creation on sign-in
    - Fallback mechanisms for missing records
*/

-- Drop and recreate the user initialization function with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION initialize_user_usage()
RETURNS TRIGGER AS $$
DECLARE
  usage_created boolean := false;
  subscription_created boolean := false;
BEGIN
  -- Log the user creation attempt
  RAISE NOTICE 'Initializing records for user: %', NEW.id;
  
  -- Try to create usage record
  BEGIN
    INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
    VALUES (
      NEW.id,
      0,
      3, -- Free tier: 3 prompts
      now() + interval '1 month'
    );
    usage_created := true;
    RAISE NOTICE 'Created usage record for user: %', NEW.id;
  EXCEPTION 
    WHEN unique_violation THEN
      RAISE NOTICE 'Usage record already exists for user: %', NEW.id;
      usage_created := true;
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create usage record for user %: %', NEW.id, SQLERRM;
      usage_created := false;
  END;
  
  -- Try to create subscription record
  BEGIN
    INSERT INTO user_subscriptions (user_id, plan_type, status)
    VALUES (
      NEW.id,
      'free',
      'active'
    );
    subscription_created := true;
    RAISE NOTICE 'Created subscription record for user: %', NEW.id;
  EXCEPTION 
    WHEN unique_violation THEN
      RAISE NOTICE 'Subscription record already exists for user: %', NEW.id;
      subscription_created := true;
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create subscription record for user %: %', NEW.id, SQLERRM;
      subscription_created := false;
  END;
  
  -- If either creation failed, log it but don't prevent user creation
  IF NOT usage_created OR NOT subscription_created THEN
    RAISE WARNING 'Some user records failed to create for user %. Usage: %, Subscription: %', 
      NEW.id, usage_created, subscription_created;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_usage();

-- Improved function to ensure user records exist (called on sign-in)
CREATE OR REPLACE FUNCTION ensure_user_records_robust(user_uuid uuid)
RETURNS json AS $$
DECLARE
  usage_record user_usage%ROWTYPE;
  subscription_record user_subscriptions%ROWTYPE;
  usage_created boolean := false;
  subscription_created boolean := false;
  result json;
BEGIN
  -- Check if usage record exists
  SELECT * INTO usage_record FROM user_usage WHERE user_id = user_uuid;
  
  -- Create usage record if missing
  IF usage_record IS NULL THEN
    BEGIN
      INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
      VALUES (user_uuid, 0, 3, now() + interval '1 month')
      ON CONFLICT (user_id) DO NOTHING;
      
      SELECT * INTO usage_record FROM user_usage WHERE user_id = user_uuid;
      usage_created := true;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create usage record for %: %', user_uuid, SQLERRM;
    END;
  ELSE
    usage_created := true;
  END IF;
  
  -- Check if subscription record exists
  SELECT * INTO subscription_record FROM user_subscriptions WHERE user_id = user_uuid;
  
  -- Create subscription record if missing
  IF subscription_record IS NULL THEN
    BEGIN
      INSERT INTO user_subscriptions (user_id, plan_type, status)
      VALUES (user_uuid, 'free', 'active')
      ON CONFLICT (user_id) DO NOTHING;
      
      SELECT * INTO subscription_record FROM user_subscriptions WHERE user_id = user_uuid;
      subscription_created := true;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create subscription record for %: %', user_uuid, SQLERRM;
    END;
  ELSE
    subscription_created := true;
  END IF;
  
  -- Return comprehensive result
  result := json_build_object(
    'success', usage_created AND subscription_created,
    'usage_exists', usage_record IS NOT NULL,
    'subscription_exists', subscription_record IS NOT NULL,
    'usage_created', usage_created,
    'subscription_created', subscription_created,
    'user_id', user_uuid
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION ensure_user_records_robust(uuid) TO authenticated;

-- Improved can_generate_prompt function with better error handling
CREATE OR REPLACE FUNCTION can_generate_prompt(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  usage_record user_usage%ROWTYPE;
  subscription_record user_subscriptions%ROWTYPE;
  records_result json;
BEGIN
  -- First ensure user has records
  SELECT ensure_user_records_robust(user_uuid) INTO records_result;
  
  -- Get user usage
  SELECT * INTO usage_record FROM user_usage WHERE user_id = user_uuid;
  
  -- Get user subscription
  SELECT * INTO subscription_record FROM user_subscriptions WHERE user_id = user_uuid;
  
  -- If still no records, return false
  IF usage_record IS NULL OR subscription_record IS NULL THEN
    RAISE WARNING 'User % still missing records after ensure_user_records_robust', user_uuid;
    RETURN false;
  END IF;
  
  -- Check if subscription is active
  IF subscription_record.status != 'active' THEN
    RAISE NOTICE 'User % subscription not active: %', user_uuid, subscription_record.status;
    RETURN false;
  END IF;
  
  -- Check if usage limit exceeded
  IF usage_record.prompts_used >= usage_record.prompts_limit THEN
    RAISE NOTICE 'User % usage limit exceeded: %/%', user_uuid, usage_record.prompts_used, usage_record.prompts_limit;
    RETURN false;
  END IF;
  
  -- Check if reset date has passed (for free users)
  IF subscription_record.plan_type = 'free' AND usage_record.reset_date < now() THEN
    -- Reset usage for free users monthly
    UPDATE user_usage 
    SET 
      prompts_used = 0,
      reset_date = now() + interval '1 month',
      updated_at = now()
    WHERE user_id = user_uuid;
    
    RAISE NOTICE 'Reset usage for free user %', user_uuid;
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in can_generate_prompt for user %: %', user_uuid, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improved increment_prompt_usage function
CREATE OR REPLACE FUNCTION increment_prompt_usage(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  updated_rows integer;
  records_result json;
BEGIN
  -- First ensure user has records
  SELECT ensure_user_records_robust(user_uuid) INTO records_result;
  
  -- Try to increment usage
  UPDATE user_usage 
  SET 
    prompts_used = prompts_used + 1,
    updated_at = now()
  WHERE user_id = user_uuid;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows = 0 THEN
    RAISE WARNING 'Failed to increment usage for user %', user_uuid;
    RETURN false;
  END IF;
  
  RAISE NOTICE 'Incremented usage for user %', user_uuid;
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error incrementing usage for user %: %', user_uuid, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix Stripe payment processing with better error handling
CREATE OR REPLACE FUNCTION update_usage_from_payment(
  customer_id_param text,
  price_id_param text
)
RETURNS boolean AS $$
DECLARE
  user_record auth.users%ROWTYPE;
  current_usage user_usage%ROWTYPE;
  current_subscription user_subscriptions%ROWTYPE;
  additional_prompts integer := 0;
  new_limit integer;
  plan_type_val text;
  records_result json;
BEGIN
  -- Get user from stripe customer
  SELECT u.* INTO user_record
  FROM auth.users u
  JOIN stripe_customers sc ON sc.user_id = u.id
  WHERE sc.customer_id = customer_id_param AND sc.deleted_at IS NULL;

  IF user_record IS NULL THEN
    RAISE WARNING 'No user found for customer_id: %', customer_id_param;
    RETURN false;
  END IF;

  -- Ensure user has records
  SELECT ensure_user_records_robust(user_record.id) INTO records_result;

  -- Get current usage and subscription
  SELECT * INTO current_usage FROM user_usage WHERE user_id = user_record.id;
  SELECT * INTO current_subscription FROM user_subscriptions WHERE user_id = user_record.id;

  IF current_usage IS NULL OR current_subscription IS NULL THEN
    RAISE WARNING 'Missing records for user % after ensure_user_records_robust', user_record.id;
    RETURN false;
  END IF;

  -- Determine additional prompts and plan type based on price_id
  CASE price_id_param
    WHEN 'price_1RfHQ8RvFuWdm2ByorcAPrXa' THEN -- Monthly plan ($4.95 AUD)
      additional_prompts := 100;
      plan_type_val := 'monthly';
    WHEN 'price_1RfHR6RvFuWdm2By2DTIZEeu' THEN -- Yearly plan ($49.50 AUD)
      additional_prompts := 1500;
      plan_type_val := 'yearly';
    ELSE
      RAISE WARNING 'Unknown price_id: %', price_id_param;
      RETURN false;
  END CASE;

  -- Add prompts to current limit
  new_limit := current_usage.prompts_limit + additional_prompts;
  
  -- Update usage
  UPDATE user_usage 
  SET 
    prompts_limit = new_limit,
    updated_at = now()
  WHERE user_id = user_record.id;

  -- Update subscription record
  UPDATE user_subscriptions 
  SET 
    plan_type = plan_type_val,
    status = 'active',
    updated_at = now()
  WHERE user_id = user_record.id;

  RAISE NOTICE 'Successfully updated user % with % additional prompts (plan: %)', 
    user_record.id, additional_prompts, plan_type_val;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating usage from payment for customer %: %', customer_id_param, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure all existing users have proper records
DO $$
DECLARE
  user_record RECORD;
  result json;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    SELECT ensure_user_records_robust(user_record.id) INTO result;
    RAISE NOTICE 'Ensured records for user %: %', user_record.id, result;
  END LOOP;
END $$;
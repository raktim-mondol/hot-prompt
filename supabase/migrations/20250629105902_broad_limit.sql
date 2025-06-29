/*
  # Fix Usage and Subscription Functions

  1. Database Functions
    - Fix RPC functions for checking and incrementing usage
    - Add proper error handling and logging
    - Ensure functions work with current schema

  2. Data Initialization
    - Ensure all users have proper usage and subscription records
    - Fix any missing data issues

  3. Security
    - Maintain RLS policies
    - Ensure proper permissions for functions
*/

-- Fix the can_generate_prompt function
CREATE OR REPLACE FUNCTION can_generate_prompt(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  usage_record user_usage%ROWTYPE;
  subscription_record user_subscriptions%ROWTYPE;
BEGIN
  -- Get user usage
  SELECT * INTO usage_record FROM user_usage WHERE user_id = user_uuid;
  
  -- Get user subscription
  SELECT * INTO subscription_record FROM user_subscriptions WHERE user_id = user_uuid;
  
  -- If no records found, try to create them
  IF usage_record IS NULL OR subscription_record IS NULL THEN
    -- Create missing records
    INSERT INTO user_subscriptions (user_id, plan_type, status)
    VALUES (user_uuid, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
    VALUES (user_uuid, 0, 3, now() + interval '1 month')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Retry getting the records
    SELECT * INTO usage_record FROM user_usage WHERE user_id = user_uuid;
    SELECT * INTO subscription_record FROM user_subscriptions WHERE user_id = user_uuid;
    
    -- If still null, return false
    IF usage_record IS NULL OR subscription_record IS NULL THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Check if subscription is active
  IF subscription_record.status != 'active' THEN
    RETURN false;
  END IF;
  
  -- Check if usage limit exceeded
  IF usage_record.prompts_used >= usage_record.prompts_limit THEN
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
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the increment_prompt_usage function
CREATE OR REPLACE FUNCTION increment_prompt_usage(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  updated_rows integer;
BEGIN
  UPDATE user_usage 
  SET 
    prompts_used = prompts_used + 1,
    updated_at = now()
  WHERE user_id = user_uuid;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  -- If no rows were updated, try to create the record
  IF updated_rows = 0 THEN
    INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
    VALUES (user_uuid, 1, 3, now() + interval '1 month')
    ON CONFLICT (user_id) DO UPDATE SET
      prompts_used = user_usage.prompts_used + 1,
      updated_at = now();
    
    RETURN true;
  END IF;
  
  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure user has all required records
CREATE OR REPLACE FUNCTION ensure_user_records(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Ensure subscription record exists
  INSERT INTO user_subscriptions (user_id, plan_type, status)
  VALUES (user_uuid, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Ensure usage record exists
  INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
  VALUES (user_uuid, 0, 3, now() + interval '1 month')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger function to ensure records exist
CREATE OR REPLACE FUNCTION initialize_user_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert usage record
  INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
  VALUES (
    NEW.id,
    0,
    3, -- Free tier: 3 prompts
    now() + interval '1 month'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert subscription record
  INSERT INTO user_subscriptions (user_id, plan_type, status)
  VALUES (
    NEW.id,
    'free',
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint to user_subscriptions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_subscriptions_user_id_key' 
    AND table_name = 'user_subscriptions'
  ) THEN
    ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Ensure all existing users have the required records
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    PERFORM ensure_user_records(user_record.id);
  END LOOP;
END $$;
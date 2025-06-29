/*
  # User Subscriptions and Usage Tracking

  1. New Tables
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `stripe_customer_id` (text, unique)
      - `stripe_subscription_id` (text, unique)
      - `plan_type` (text: 'free', 'monthly', 'yearly')
      - `status` (text: 'active', 'canceled', 'past_due', 'incomplete')
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `user_usage`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `prompts_used` (integer, default 0)
      - `prompts_limit` (integer)
      - `reset_date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to read/update their own data
    - Add policies for service role to manage subscriptions

  3. Functions
    - Function to initialize user usage on signup
    - Function to check and update usage limits
*/

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_usage table
CREATE TABLE IF NOT EXISTS user_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  prompts_used integer DEFAULT 0,
  prompts_limit integer DEFAULT 3,
  reset_date timestamptz DEFAULT (now() + interval '1 month'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can read own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON user_subscriptions
  FOR ALL
  TO service_role
  USING (true);

-- RLS Policies for user_usage
CREATE POLICY "Users can read own usage"
  ON user_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON user_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage"
  ON user_usage
  FOR ALL
  TO service_role
  USING (true);

-- Function to initialize user usage on signup
CREATE OR REPLACE FUNCTION initialize_user_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_usage (user_id, prompts_used, prompts_limit, reset_date)
  VALUES (
    NEW.id,
    0,
    3, -- Free tier: 3 prompts
    now() + interval '1 month'
  );
  
  INSERT INTO user_subscriptions (user_id, plan_type, status)
  VALUES (
    NEW.id,
    'free',
    'active'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize usage when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_usage();

-- Function to update usage limits based on subscription
CREATE OR REPLACE FUNCTION update_usage_limits()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_usage 
  SET 
    prompts_limit = CASE 
      WHEN NEW.plan_type = 'free' THEN 3
      WHEN NEW.plan_type = 'monthly' THEN 100
      WHEN NEW.plan_type = 'yearly' THEN 1500
      ELSE prompts_limit
    END,
    reset_date = CASE 
      WHEN NEW.plan_type = 'monthly' THEN NEW.current_period_end
      WHEN NEW.plan_type = 'yearly' THEN NEW.current_period_end
      ELSE reset_date
    END,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update usage limits when subscription changes
DROP TRIGGER IF EXISTS on_subscription_updated ON user_subscriptions;
CREATE TRIGGER on_subscription_updated
  AFTER UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_usage_limits();

-- Function to check if user can generate prompts
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
  
  -- If no records found, return false
  IF usage_record IS NULL OR subscription_record IS NULL THEN
    RETURN false;
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

-- Function to increment prompt usage
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
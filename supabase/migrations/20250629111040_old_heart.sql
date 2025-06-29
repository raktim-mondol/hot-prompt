/*
  # Fix payment amount handling for AUD pricing

  1. Updates
    - Fix the payment amount detection in handle_successful_payment function
    - Update price mappings to handle correct AUD amounts in cents
    - Ensure proper price_id detection based on Stripe amounts

  2. Notes
    - AUD $4.95 = 495 cents
    - AUD $49.50 = 4950 cents
*/

-- Update the payment handling function with correct AUD amounts
CREATE OR REPLACE FUNCTION handle_successful_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed payments
  IF NEW.status = 'completed' AND NEW.payment_status = 'paid' THEN
    DECLARE
      price_id text;
    BEGIN
      -- Determine price_id based on amount (in cents)
      -- Note: Stripe amounts are in the smallest currency unit (cents for AUD)
      CASE NEW.amount_total
        WHEN 495 THEN -- $4.95 AUD in cents
          price_id := 'price_1RfHQ8RvFuWdm2ByorcAPrXa';
        WHEN 4950 THEN -- $49.50 AUD in cents  
          price_id := 'price_1RfHR6RvFuWdm2By2DTIZEeu';
        ELSE
          -- Log unexpected amount for debugging
          RAISE NOTICE 'Unexpected payment amount: % cents', NEW.amount_total;
          price_id := NULL;
      END CASE;

      IF price_id IS NOT NULL THEN
        RAISE NOTICE 'Processing payment with price_id: % for amount: %', price_id, NEW.amount_total;
        PERFORM update_usage_from_payment(NEW.customer_id, price_id);
      ELSE
        RAISE NOTICE 'No matching price_id found for amount: %', NEW.amount_total;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the usage update function to handle the correct price IDs
CREATE OR REPLACE FUNCTION update_usage_from_payment(
  customer_id_param text,
  price_id_param text
)
RETURNS boolean AS $$
DECLARE
  user_record auth.users%ROWTYPE;
  current_usage user_usage%ROWTYPE;
  additional_prompts integer := 0;
  new_limit integer;
  plan_type_val text;
BEGIN
  -- Get user from stripe customer
  SELECT u.* INTO user_record
  FROM auth.users u
  JOIN stripe_customers sc ON sc.user_id = u.id
  WHERE sc.customer_id = customer_id_param;

  IF user_record IS NULL THEN
    RAISE NOTICE 'No user found for customer_id: %', customer_id_param;
    RETURN false;
  END IF;

  -- Get current usage
  SELECT * INTO current_usage FROM user_usage WHERE user_id = user_record.id;

  IF current_usage IS NULL THEN
    RAISE NOTICE 'No usage record found for user: %', user_record.id;
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
      RAISE NOTICE 'Unknown price_id: %', price_id_param;
      additional_prompts := 0;
      plan_type_val := 'free';
  END CASE;

  IF additional_prompts > 0 THEN
    -- Add prompts to current limit
    new_limit := current_usage.prompts_limit + additional_prompts;
    
    UPDATE user_usage 
    SET 
      prompts_limit = new_limit,
      updated_at = now()
    WHERE user_id = user_record.id;

    -- Update subscription record to reflect the purchase
    UPDATE user_subscriptions 
    SET 
      plan_type = plan_type_val,
      status = 'active',
      updated_at = now()
    WHERE user_id = user_record.id;

    RAISE NOTICE 'Successfully updated user % with % additional prompts (plan: %)', user_record.id, additional_prompts, plan_type_val;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current plan based on recent purchases
CREATE OR REPLACE FUNCTION get_user_current_plan(user_uuid uuid)
RETURNS text AS $$
DECLARE
  recent_order stripe_orders%ROWTYPE;
  customer_id_val text;
BEGIN
  -- Get user's customer ID
  SELECT sc.customer_id INTO customer_id_val
  FROM stripe_customers sc
  WHERE sc.user_id = user_uuid AND sc.deleted_at IS NULL;

  IF customer_id_val IS NULL THEN
    RETURN 'free';
  END IF;

  -- Get most recent completed order
  SELECT * INTO recent_order
  FROM stripe_orders
  WHERE customer_id = customer_id_val 
    AND status = 'completed' 
    AND payment_status = 'paid'
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF recent_order IS NULL THEN
    RETURN 'free';
  END IF;

  -- Determine plan based on amount (in cents)
  CASE recent_order.amount_total
    WHEN 495 THEN -- $4.95 AUD
      RETURN 'monthly';
    WHEN 4950 THEN -- $49.50 AUD
      RETURN 'yearly';
    ELSE
      RETURN 'free';
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
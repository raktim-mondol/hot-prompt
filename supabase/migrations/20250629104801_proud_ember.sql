/*
  # Update Usage System for Payment Integration

  1. Functions
    - Update usage limits based on Stripe orders
    - Function to process successful payments
    - Function to update user limits after purchase

  2. Changes
    - Add function to handle one-time payment upgrades
    - Update usage limits based on purchased products
*/

-- Function to update usage limits based on successful payment
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
BEGIN
  -- Get user from stripe customer
  SELECT u.* INTO user_record
  FROM auth.users u
  JOIN stripe_customers sc ON sc.user_id = u.id
  WHERE sc.customer_id = customer_id_param;

  IF user_record IS NULL THEN
    RETURN false;
  END IF;

  -- Get current usage
  SELECT * INTO current_usage FROM user_usage WHERE user_id = user_record.id;

  IF current_usage IS NULL THEN
    RETURN false;
  END IF;

  -- Determine additional prompts based on price_id
  -- These should match your Stripe price IDs
  CASE price_id_param
    WHEN 'price_1RfHQ8RvFuWdm2ByorcAPrXa' THEN -- Monthly plan
      additional_prompts := 100;
    WHEN 'price_1RfHR6RvFuWdm2By2DTIZEeu' THEN -- Yearly plan
      additional_prompts := 1500;
    ELSE
      additional_prompts := 0;
  END CASE;

  IF additional_prompts > 0 THEN
    -- Add prompts to current limit
    new_limit := current_usage.prompts_limit + additional_prompts;
    
    UPDATE user_usage 
    SET 
      prompts_limit = new_limit,
      updated_at = now()
    WHERE user_id = user_record.id;

    -- Also update subscription record to reflect the purchase
    UPDATE user_subscriptions 
    SET 
      plan_type = CASE 
        WHEN price_id_param = 'price_1RfHQ8RvFuWdm2ByorcAPrXa' THEN 'monthly'
        WHEN price_id_param = 'price_1RfHR6RvFuWdm2By2DTIZEeu' THEN 'yearly'
        ELSE plan_type
      END,
      status = 'active',
      updated_at = now()
    WHERE user_id = user_record.id;

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle successful Stripe checkout
CREATE OR REPLACE FUNCTION handle_successful_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed payments
  IF NEW.status = 'completed' AND NEW.payment_status = 'paid' THEN
    -- Get the price_id from the checkout session (you might need to store this)
    -- For now, we'll determine based on amount
    DECLARE
      price_id text;
    BEGIN
      -- Determine price_id based on amount (in cents)
      CASE NEW.amount_total
        WHEN 495 THEN -- $4.95 AUD in cents
          price_id := 'price_1RfHQ8RvFuWdm2ByorcAPrXa';
        WHEN 4950 THEN -- $49.50 AUD in cents
          price_id := 'price_1RfHR6RvFuWdm2By2DTIZEeu';
        ELSE
          price_id := NULL;
      END CASE;

      IF price_id IS NOT NULL THEN
        PERFORM update_usage_from_payment(NEW.customer_id, price_id);
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle successful payments
DROP TRIGGER IF EXISTS on_payment_completed ON stripe_orders;
CREATE TRIGGER on_payment_completed
  AFTER INSERT OR UPDATE ON stripe_orders
  FOR EACH ROW EXECUTE FUNCTION handle_successful_payment();

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

  -- Determine plan based on amount
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
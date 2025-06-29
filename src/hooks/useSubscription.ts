import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_type: 'free' | 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserUsage {
  id: string;
  user_id: string;
  prompts_used: number;
  prompts_limit: number;
  reset_date: string;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureUserRecords = async () => {
    if (!user) return false;

    try {
      console.log('Ensuring user records for:', user.id);
      
      // Call the robust function to ensure user has all required records
      const { data, error: ensureError } = await supabase.rpc('ensure_user_records_robust', {
        user_uuid: user.id
      });

      if (ensureError) {
        console.error('Error ensuring user records:', ensureError);
        return false;
      }

      console.log('User records ensured:', data);
      return data?.success || false;
    } catch (err) {
      console.error('Error calling ensure_user_records_robust:', err);
      return false;
    }
  };

  const fetchSubscriptionData = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching subscription data for user:', user.id);

      // First ensure user has all required records
      const recordsEnsured = await ensureUserRecords();
      if (!recordsEnsured) {
        console.warn('Failed to ensure user records, continuing with fetch...');
      }

      // Fetch subscription data with retry logic
      let subscriptionData = null;
      let usageData = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && (!subscriptionData || !usageData)) {
        if (retryCount > 0) {
          console.log(`Retry ${retryCount} for fetching user data...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }

        // Fetch subscription data
        if (!subscriptionData) {
          const { data: subData, error: subscriptionError } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (subscriptionError) {
            console.error('Subscription fetch error:', subscriptionError);
            if (retryCount === maxRetries - 1) {
              throw subscriptionError;
            }
          } else {
            subscriptionData = subData;
          }
        }

        // Fetch usage data
        if (!usageData) {
          const { data: usageDataResult, error: usageError } = await supabase
            .from('user_usage')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (usageError) {
            console.error('Usage fetch error:', usageError);
            if (retryCount === maxRetries - 1) {
              throw usageError;
            }
          } else {
            usageData = usageDataResult;
          }
        }

        retryCount++;
      }

      // If we still don't have data after retries, create default records
      if (!subscriptionData || !usageData) {
        console.warn('Still missing data after retries, creating defaults...');
        
        // Try one more time to ensure records
        await ensureUserRecords();
        
        // Set default values
        if (!subscriptionData) {
          subscriptionData = {
            id: 'default',
            user_id: user.id,
            stripe_customer_id: null,
            stripe_subscription_id: null,
            plan_type: 'free',
            status: 'active',
            current_period_start: null,
            current_period_end: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        
        if (!usageData) {
          usageData = {
            id: 'default',
            user_id: user.id,
            prompts_used: 0,
            prompts_limit: 3,
            reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      }

      setSubscription(subscriptionData);
      setUsage(usageData);
      
      console.log('Successfully loaded subscription data:', {
        subscription: subscriptionData,
        usage: usageData
      });

    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription data');
      
      // Set default values on error to prevent app from breaking
      setSubscription({
        id: 'error-default',
        user_id: user.id,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        plan_type: 'free',
        status: 'active',
        current_period_start: null,
        current_period_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      setUsage({
        id: 'error-default',
        user_id: user.id,
        prompts_used: 0,
        prompts_limit: 3,
        reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const canGeneratePrompt = async (): Promise<boolean> => {
    if (!user) {
      console.log('No user, cannot generate prompt');
      return false;
    }

    try {
      console.log('Checking if user can generate prompt...');
      
      const { data, error } = await supabase.rpc('can_generate_prompt', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error checking prompt generation capability:', error);
        return false;
      }

      console.log('Can generate prompt result:', data);
      return data;
    } catch (err) {
      console.error('Error checking prompt generation capability:', err);
      return false;
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    if (!user) {
      console.log('No user, cannot increment usage');
      return false;
    }

    try {
      console.log('Incrementing usage for user:', user.id);
      
      const { data, error } = await supabase.rpc('increment_prompt_usage', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error incrementing usage:', error);
        return false;
      }

      console.log('Usage incremented successfully:', data);
      
      // Immediately fetch fresh data to update the UI
      setTimeout(() => {
        fetchSubscriptionData();
      }, 500);
      
      return data;
    } catch (err) {
      console.error('Error incrementing usage:', err);
      return false;
    }
  };

  const getRemainingPrompts = (): number => {
    if (!usage) return 0;
    return Math.max(0, usage.prompts_limit - usage.prompts_used);
  };

  const getUsagePercentage = (): number => {
    if (!usage || usage.prompts_limit === 0) return 0;
    return Math.min(100, (usage.prompts_used / usage.prompts_limit) * 100);
  };

  const isFreePlan = (): boolean => {
    return subscription?.plan_type === 'free' || !subscription;
  };

  const isPaidPlan = (): boolean => {
    return subscription?.plan_type === 'monthly' || subscription?.plan_type === 'yearly';
  };

  const isSubscriptionActive = (): boolean => {
    return subscription?.status === 'active';
  };

  return {
    subscription,
    usage,
    loading,
    error,
    canGeneratePrompt,
    incrementUsage,
    getRemainingPrompts,
    getUsagePercentage,
    isFreePlan,
    isPaidPlan,
    isSubscriptionActive,
    refetch: fetchSubscriptionData,
  };
};
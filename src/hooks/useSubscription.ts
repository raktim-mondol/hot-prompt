import { useState, useEffect } from 'react';
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
    if (!user) return;

    try {
      // Call the function to ensure user has all required records
      const { error: ensureError } = await supabase.rpc('ensure_user_records', {
        user_uuid: user.id
      });

      if (ensureError) {
        console.error('Error ensuring user records:', ensureError);
      }
    } catch (err) {
      console.error('Error calling ensure_user_records:', err);
    }
  };

  const fetchSubscriptionData = async () => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First ensure user has all required records
      await ensureUserRecords();

      // Fetch subscription data
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subscriptionError) {
        console.error('Subscription fetch error:', subscriptionError);
        throw subscriptionError;
      }

      // Fetch usage data
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (usageError) {
        console.error('Usage fetch error:', usageError);
        throw usageError;
      }

      // If we still don't have data, create default records
      if (!subscriptionData || !usageData) {
        console.log('Missing data, creating default records...');
        
        // Create subscription record if missing
        if (!subscriptionData) {
          const { data: newSub, error: createSubError } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: user.id,
              plan_type: 'free',
              status: 'active'
            })
            .select()
            .single();

          if (createSubError) {
            console.error('Error creating subscription:', createSubError);
          } else {
            setSubscription(newSub);
          }
        } else {
          setSubscription(subscriptionData);
        }

        // Create usage record if missing
        if (!usageData) {
          const { data: newUsage, error: createUsageError } = await supabase
            .from('user_usage')
            .insert({
              user_id: user.id,
              prompts_used: 0,
              prompts_limit: 3,
              reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

          if (createUsageError) {
            console.error('Error creating usage:', createUsageError);
          } else {
            setUsage(newUsage);
          }
        } else {
          setUsage(usageData);
        }
      } else {
        setSubscription(subscriptionData);
        setUsage(usageData);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription data');
      
      // Set default values on error
      setSubscription({
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
      });
      
      setUsage({
        id: 'default',
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
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  const canGeneratePrompt = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('can_generate_prompt', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error checking prompt generation capability:', error);
        return false;
      }

      return data;
    } catch (err) {
      console.error('Error checking prompt generation capability:', err);
      return false;
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('increment_prompt_usage', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error incrementing usage:', error);
        return false;
      }

      // Refresh usage data
      await fetchSubscriptionData();
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
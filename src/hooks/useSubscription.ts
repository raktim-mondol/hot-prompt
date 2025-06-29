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

      // Fetch subscription data
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      // Fetch usage data
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        throw usageError;
      }

      setSubscription(subscriptionData);
      setUsage(usageData);
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription data');
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
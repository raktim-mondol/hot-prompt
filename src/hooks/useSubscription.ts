import { useState, useEffect, useCallback, useRef } from 'react';
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
  const fetchingRef = useRef(false);

  const fetchSubscriptionData = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      console.log('Setting up user records for:', user.id);

      // First, ensure user has all required records
      const { data: setupResult, error: setupError } = await supabase.rpc('ensure_user_setup', {
        user_uuid: user.id
      });

      if (setupError) {
        console.error('Error setting up user records:', setupError);
        throw setupError;
      }

      console.log('User setup result:', setupResult);

      // Now fetch the data
      const [subscriptionResponse, usageResponse] = await Promise.all([
        supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      if (subscriptionResponse.error) {
        console.error('Subscription fetch error:', subscriptionResponse.error);
        throw subscriptionResponse.error;
      }

      if (usageResponse.error) {
        console.error('Usage fetch error:', usageResponse.error);
        throw usageResponse.error;
      }

      setSubscription(subscriptionResponse.data);
      setUsage(usageResponse.data);

      console.log('Successfully loaded user data:', {
        subscription: subscriptionResponse.data,
        usage: usageResponse.data
      });

    } catch (err) {
      console.error('Error in fetchSubscriptionData:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
      
      // Set minimal defaults to prevent app from breaking
      if (user) {
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
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
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
      
      // Update local state immediately to prevent flicker
      if (usage) {
        setUsage(prev => prev ? {
          ...prev,
          prompts_used: prev.prompts_used + 1,
          updated_at: new Date().toISOString()
        } : prev);
      }
      
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
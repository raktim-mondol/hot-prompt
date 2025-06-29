import React, { useState } from 'react';
import { Check, Zap, Crown, Gift, Loader2 } from 'lucide-react';
import { stripeProducts } from '../stripe-config';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface PricingSectionProps {
  currentPlan?: 'free' | 'monthly' | 'yearly';
}

export const PricingSection: React.FC<PricingSectionProps> = ({ 
  currentPlan = 'free' 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (priceId: string, planId: string) => {
    if (!user) {
      setError('Please sign in to upgrade');
      return;
    }

    setLoading(planId);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'stripe-checkout',
        {
          body: {
            price_id: priceId,
            success_url: `${window.location.origin}/success`,
            cancel_url: `${window.location.origin}/pricing`,
            mode: 'payment',
          },
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (!data.url) {
        throw new Error('No checkout URL returned');
      }

      // Redirect directly to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start payment process');
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      prompts: '3 prompts',
      resetPeriod: 'per month',
      features: [
        '3 AI-generated prompts per month',
        'Basic prompt templates',
        'Copy to clipboard',
        'Email support'
      ],
      icon: Gift,
      current: currentPlan === 'free',
      popular: false,
      priceId: null,
    },
    {
      id: 'monthly',
      name: 'Pro Monthly',
      price: '$4.95',
      period: 'per month',
      prompts: '100 prompts',
      resetPeriod: 'per month',
      features: stripeProducts.find(p => p.name === 'Hot Prompt Month')?.features || [
        '100 AI-generated prompts per month',
        'Advanced prompt templates',
        'Priority generation',
        'Save unlimited favorites',
        'Export prompts',
        'Priority email support'
      ],
      icon: Zap,
      current: currentPlan === 'monthly',
      popular: true,
      priceId: stripeProducts.find(p => p.name === 'Hot Prompt Month')?.priceId,
    },
    {
      id: 'yearly',
      name: 'Pro Yearly',
      price: '$49.50',
      period: 'per year',
      prompts: '1,500 prompts',
      resetPeriod: 'per year',
      savings: 'Save 16%',
      features: stripeProducts.find(p => p.name === 'Hot Prompt Year')?.features || [
        '1,500 AI-generated prompts per year',
        'Advanced prompt templates',
        'Priority generation',
        'Save unlimited favorites',
        'Export prompts',
        'Priority email support',
        'Early access to new features'
      ],
      icon: Crown,
      current: currentPlan === 'yearly',
      popular: false,
      priceId: stripeProducts.find(p => p.name === 'Hot Prompt Year')?.priceId,
    },
  ];

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-orange-200/50 p-8 shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose Your Plan</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Start with our free plan and upgrade when you need more prompts. 
          All plans include our powerful AI prompt generation and organization tools.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = plan.current;
          const canUpgrade = plan.id !== 'free' && !isCurrentPlan && plan.priceId;
          const isLoadingPlan = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
                plan.popular
                  ? 'border-orange-300 shadow-md'
                  : isCurrentPlan
                  ? 'border-green-300 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Current</span>
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center space-x-1 mb-1">
                  <span className="text-3xl font-bold text-gray-800">{plan.price}</span>
                  <span className="text-gray-600 text-sm">{plan.period}</span>
                </div>
                {plan.savings && (
                  <div className="text-green-600 text-sm font-medium">{plan.savings}</div>
                )}
              </div>

              {/* Prompts Info */}
              <div className="text-center bg-gray-50 rounded-lg p-3 mb-6">
                <div className="text-lg font-semibold text-gray-800">{plan.prompts}</div>
                <div className="text-sm text-gray-600">{plan.resetPeriod}</div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <button
                onClick={() => canUpgrade && plan.priceId && handleUpgrade(plan.priceId, plan.id)}
                disabled={!canUpgrade || isLoadingPlan || !plan.priceId}
                className={`w-full py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isCurrentPlan
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : plan.id === 'free'
                    ? 'bg-gray-100 text-gray-500 cursor-default'
                    : canUpgrade && plan.priceId
                    ? 'bg-orange-500 hover:bg-orange-600 text-white hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'bg-gray-100 text-gray-500 cursor-default'
                }`}
              >
                {isLoadingPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : isCurrentPlan ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Current Plan</span>
                  </>
                ) : plan.id === 'free' ? (
                  <span>Free Forever</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Upgrade Now</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 mb-2">
          All paid plans include a 7-day money-back guarantee
        </p>
        <p className="text-xs text-gray-400">
          Prices in Australian Dollars (AUD). Cancel anytime.
        </p>
      </div>
    </div>
  );
};
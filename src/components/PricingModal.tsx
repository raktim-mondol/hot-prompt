import React, { useState } from 'react';
import { X, Check, Zap, Crown, Gift, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { stripeProducts } from '../stripe-config';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: 'free' | 'monthly' | 'yearly';
}

export const PricingModal: React.FC<PricingModalProps> = ({ 
  isOpen, 
  onClose, 
  currentPlan = 'free' 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string, planType: string) => {
    if (!user) {
      setError('Please sign in to subscribe');
      return;
    }

    setLoading(planType);
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

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start subscription');
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 'AUD $0',
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
      color: 'from-gray-400 to-gray-600',
      buttonColor: 'bg-gray-500 hover:bg-gray-600',
      current: currentPlan === 'free',
      popular: false,
      priceId: null,
    },
    {
      id: 'monthly',
      name: 'Pro Monthly',
      price: 'AUD $4.95',
      period: 'per month',
      prompts: '100 prompts',
      resetPeriod: 'per month',
      features: [
        '100 AI-generated prompts per month',
        'Advanced prompt templates',
        'Priority generation',
        'Save unlimited favorites',
        'Export prompts',
        'Priority email support'
      ],
      icon: Zap,
      color: 'from-orange-400 to-red-500',
      buttonColor: 'bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600',
      current: currentPlan === 'monthly',
      popular: true,
      priceId: stripeProducts.find(p => p.name === 'Hot Prompt Month')?.priceId,
    },
    {
      id: 'yearly',
      name: 'Pro Yearly',
      price: 'AUD $49.50',
      period: 'per year',
      prompts: '1,500 prompts',
      resetPeriod: 'per year',
      savings: 'Save 16%',
      features: [
        '1,500 AI-generated prompts per year',
        'Advanced prompt templates',
        'Priority generation',
        'Save unlimited favorites',
        'Export prompts',
        'Priority email support',
        'Early access to new features'
      ],
      icon: Crown,
      color: 'from-purple-400 to-pink-500',
      buttonColor: 'bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600',
      current: currentPlan === 'yearly',
      popular: false,
      priceId: stripeProducts.find(p => p.name === 'Hot Prompt Year')?.priceId,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Choose Your Plan</h2>
            <p className="text-gray-600">Upgrade to unlock more prompts and features</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = plan.current;
              const canSubscribe = plan.id !== 'free' && !isCurrentPlan && plan.priceId;
              const isLoadingPlan = loading === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white border-2 rounded-2xl p-6 transition-all duration-200 ${
                    plan.popular
                      ? 'border-orange-300 shadow-lg scale-105'
                      : isCurrentPlan
                      ? 'border-green-300 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-1 rounded-full text-xs font-medium">
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

                  {/* Plan Icon */}
                  <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Plan Details */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className="text-3xl font-bold text-gray-800">{plan.price}</span>
                      <span className="text-gray-600 text-sm">{plan.period}</span>
                    </div>
                    {plan.savings && (
                      <div className="text-green-600 text-sm font-medium">{plan.savings}</div>
                    )}
                    <div className="mt-3 text-center">
                      <div className="text-lg font-semibold text-gray-800">{plan.prompts}</div>
                      <div className="text-sm text-gray-600">{plan.resetPeriod}</div>
                    </div>
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
                    onClick={() => canSubscribe && plan.priceId && handleSubscribe(plan.priceId, plan.id)}
                    disabled={!canSubscribe || isLoadingPlan || !plan.priceId}
                    className={`w-full py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2 ${
                      isCurrentPlan
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : canSubscribe && plan.priceId
                        ? `${plan.buttonColor} text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`
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
                    ) : canSubscribe && plan.priceId ? (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Subscribe Now</span>
                      </>
                    ) : (
                      <span>Free Forever</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-2">
              All plans include a 7-day money-back guarantee
            </p>
            <p className="text-xs text-gray-400">
              Prices in Australian Dollars (AUD). Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
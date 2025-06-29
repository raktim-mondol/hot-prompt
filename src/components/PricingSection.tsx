import React from 'react';
import { Check, Zap, Crown, Gift, Sparkles } from 'lucide-react';
import { stripeProducts } from '../stripe-config';

interface PricingSectionProps {
  onUpgradeClick: () => void;
  currentPlan?: 'free' | 'monthly' | 'yearly';
}

export const PricingSection: React.FC<PricingSectionProps> = ({ 
  onUpgradeClick, 
  currentPlan = 'free' 
}) => {
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
      borderColor: 'border-gray-200',
      current: currentPlan === 'free',
      popular: false,
    },
    {
      id: 'monthly',
      name: 'Pro Monthly',
      price: 'AUD $4.95',
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
      color: 'from-orange-400 to-red-500',
      borderColor: 'border-orange-300',
      current: currentPlan === 'monthly',
      popular: true,
    },
    {
      id: 'yearly',
      name: 'Pro Yearly',
      price: 'AUD $49.50',
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
      color: 'from-purple-400 to-pink-500',
      borderColor: 'border-purple-300',
      current: currentPlan === 'yearly',
      popular: false,
    },
  ];

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-orange-200/50 p-8 shadow-lg">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Sparkles className="w-6 h-6 text-orange-500" />
          <h2 className="text-2xl font-bold text-gray-800">Choose Your Plan</h2>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Start with our free plan and upgrade when you need more prompts. 
          All plans include our powerful AI prompt generation and organization tools.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = plan.current;

          return (
            <div
              key={plan.id}
              className={`relative bg-white/80 backdrop-blur-sm border-2 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl ${
                plan.popular
                  ? 'border-orange-300 shadow-lg scale-105 ring-2 ring-orange-200/50'
                  : isCurrentPlan
                  ? 'border-green-300 shadow-md'
                  : `${plan.borderColor} hover:border-orange-200`
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-1 rounded-full text-xs font-medium shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 shadow-lg">
                    <Check className="w-3 h-3" />
                    <span>Current</span>
                  </div>
                </div>
              )}

              {/* Plan Icon */}
              <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
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
                  <div className="text-green-600 text-sm font-medium mb-2">{plan.savings}</div>
                )}
                <div className="text-center bg-orange-50 rounded-lg p-3 mb-4">
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
                onClick={() => !isCurrentPlan && plan.id !== 'free' && onUpgradeClick()}
                disabled={isCurrentPlan || plan.id === 'free'}
                className={`w-full py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg ${
                  isCurrentPlan
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : plan.id === 'free'
                    ? 'bg-gray-100 text-gray-500 cursor-default'
                    : 'bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white hover:shadow-xl'
                }`}
              >
                {isCurrentPlan ? (
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
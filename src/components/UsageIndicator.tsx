import React from 'react';
import { Zap, AlertTriangle, Crown } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

interface UsageIndicatorProps {
  onUpgradeClick: () => void;
}

export const UsageIndicator: React.FC<UsageIndicatorProps> = ({ onUpgradeClick }) => {
  const { 
    usage, 
    subscription, 
    loading, 
    getRemainingPrompts, 
    getUsagePercentage,
    isFreePlan 
  } = useSubscription();

  if (loading || !usage || !subscription) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-orange-200/50 p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const remainingPrompts = getRemainingPrompts();
  const usagePercentage = getUsagePercentage();
  const isLowUsage = remainingPrompts <= 1 && isFreePlan();
  const isOutOfPrompts = remainingPrompts === 0;

  const getPlanIcon = () => {
    if (subscription.plan_type === 'yearly') return Crown;
    if (subscription.plan_type === 'monthly') return Zap;
    return Zap;
  };

  const getPlanColor = () => {
    if (subscription.plan_type === 'yearly') return 'from-purple-400 to-pink-500';
    if (subscription.plan_type === 'monthly') return 'from-orange-400 to-red-500';
    return 'from-gray-400 to-gray-600';
  };

  const getStatusColor = () => {
    if (isOutOfPrompts) return 'text-red-600';
    if (isLowUsage) return 'text-orange-600';
    return 'text-gray-700';
  };

  const getProgressColor = () => {
    if (usagePercentage >= 90) return 'bg-red-500';
    if (usagePercentage >= 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const Icon = getPlanIcon();

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-orange-200/50 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${getPlanColor()} rounded-xl flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 capitalize">
              {subscription.plan_type} Plan
            </h3>
            <p className={`text-sm ${getStatusColor()}`}>
              {isOutOfPrompts ? (
                <span className="flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>No prompts remaining</span>
                </span>
              ) : (
                `${remainingPrompts} prompt${remainingPrompts !== 1 ? 's' : ''} remaining`
              )}
            </p>
          </div>
        </div>

        {isFreePlan() && (
          <button
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Upgrade
          </button>
        )}
      </div>

      {/* Usage Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-600">
          <span>{usage.prompts_used} used</span>
          <span>{usage.prompts_limit} total</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(100, usagePercentage)}%` }}
          ></div>
        </div>
      </div>

      {/* Reset Date for Free Users */}
      {isFreePlan() && (
        <div className="mt-3 text-xs text-gray-500">
          Resets on {new Date(usage.reset_date).toLocaleDateString('en-AU', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      )}

      {/* Low Usage Warning */}
      {isLowUsage && (
        <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs text-orange-700">
            You're running low on prompts! Upgrade to Pro for unlimited access.
          </p>
        </div>
      )}

      {/* Out of Prompts Message */}
      {isOutOfPrompts && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700 mb-2">
            You've used all your prompts for this period.
          </p>
          {isFreePlan() && (
            <button
              onClick={onUpgradeClick}
              className="text-xs text-red-600 hover:text-red-700 font-medium underline"
            >
              Upgrade now for more prompts →
            </button>
          )}
        </div>
      )}
    </div>
  );
};
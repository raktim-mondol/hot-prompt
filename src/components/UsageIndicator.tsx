import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

interface UsageIndicatorProps {
  onUpgradeClick: () => void;
}

export const UsageIndicator: React.FC<UsageIndicatorProps> = ({ onUpgradeClick }) => {
  const { 
    usage, 
    subscription, 
    loading, 
    error,
    getRemainingPrompts, 
    getUsagePercentage,
    refetch
  } = useSubscription();

  // Show error state with retry option
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 shadow-lg flex items-center space-x-2 max-w-xs">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <span className="text-sm text-red-700">Error loading usage</span>
        <button
          onClick={refetch}
          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
          title="Retry"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg overflow-hidden max-w-xs">
        {/* Animated loading bar */}
        <div className="h-1 bg-gray-200 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 animate-pulse w-full"></div>
        </div>
        
        <div className="px-4 py-2">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  // If no data, show default
  if (!usage || !subscription) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg overflow-hidden max-w-xs">
        <div className="h-1 bg-gray-200">
          <div className="h-full bg-green-500 w-full"></div>
        </div>
        
        <div className="px-4 py-2">
          <div className="text-sm font-medium text-gray-700">
            Usage: 0/3
          </div>
        </div>
      </div>
    );
  }

  const usagePercentage = getUsagePercentage();
  const remainingPrompts = getRemainingPrompts();
  const isOutOfPrompts = remainingPrompts === 0;

  const getProgressColor = () => {
    if (usagePercentage >= 90) return 'bg-red-500';
    if (usagePercentage >= 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg overflow-hidden max-w-xs">
      {/* Top Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div
          className={`h-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${Math.min(100, usagePercentage)}%` }}
        ></div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          {usage.prompts_used}/{usage.prompts_limit}
        </div>

        {isOutOfPrompts && (
          <button
            onClick={onUpgradeClick}
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded transition-colors"
          >
            Upgrade
          </button>
        )}
      </div>
    </div>
  );
};
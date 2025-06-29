import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Calendar, Crown, Zap, Gift, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

interface UserProfileProps {
  onUpgradeClick: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onUpgradeClick }) => {
  const { user, signOut } = useAuth();
  const { subscription, usage, loading } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const getPlanIcon = () => {
    if (subscription?.plan_type === 'yearly') return Crown;
    if (subscription?.plan_type === 'monthly') return Zap;
    return Gift;
  };

  const getPlanColor = () => {
    if (subscription?.plan_type === 'yearly') return 'text-purple-600 bg-purple-100';
    if (subscription?.plan_type === 'monthly') return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getPlanName = () => {
    if (subscription?.plan_type === 'yearly') return 'Pro Yearly';
    if (subscription?.plan_type === 'monthly') return 'Pro Monthly';
    return 'Free Plan';
  };

  const getSubscriptionEndDate = () => {
    if (!subscription?.current_period_end) return null;
    
    // Handle both timestamp formats (seconds or milliseconds)
    const timestamp = typeof subscription.current_period_end === 'string' 
      ? parseInt(subscription.current_period_end) 
      : subscription.current_period_end;
    
    // If timestamp is in seconds (typical for Stripe), convert to milliseconds
    const date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
    
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUsageResetDate = () => {
    if (!usage?.reset_date) return null;
    
    const date = new Date(usage.reset_date);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUsagePercentage = () => {
    if (!usage || usage.prompts_limit === 0) return 0;
    return Math.min(100, (usage.prompts_used / usage.prompts_limit) * 100);
  };

  const getProgressColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const PlanIcon = getPlanIcon();

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-orange-50 transition-colors group"
      >
        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-orange-600" />
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-gray-700 truncate max-w-32">
            {user.email}
          </div>
          <div className="text-xs text-gray-500 capitalize">
            {subscription?.plan_type || 'free'} plan
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999]" onClick={() => setIsOpen(false)}>
          <div 
            className="absolute right-4 top-20 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">
                    {user.email}
                  </div>
                  <div className="text-sm text-gray-600">
                    Account Settings
                  </div>
                </div>
              </div>
            </div>

            {/* Current Plan */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800">Current Plan</h4>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPlanColor()}`}>
                  <PlanIcon className="w-3 h-3" />
                  <span>{getPlanName()}</span>
                </div>
              </div>

              {/* Subscription End Date */}
              {subscription?.plan_type !== 'free' && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {subscription?.current_period_end 
                      ? `Renews on ${getSubscriptionEndDate()}`
                      : 'Active subscription'
                    }
                  </span>
                </div>
              )}

              {/* Free Plan Reset Date */}
              {subscription?.plan_type === 'free' && usage?.reset_date && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Resets on {getUsageResetDate()}</span>
                </div>
              )}
            </div>

            {/* Usage Section */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800">Usage</h4>
                <span className="text-sm text-gray-600">
                  {usage?.prompts_used || 0}/{usage?.prompts_limit || 0}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                  style={{ width: `${getUsagePercentage()}%` }}
                ></div>
              </div>

              <div className="text-xs text-gray-500">
                {usage?.prompts_limit && usage.prompts_used 
                  ? `${usage.prompts_limit - usage.prompts_used} prompts remaining`
                  : 'Loading usage data...'
                }
              </div>

              {/* Upgrade Button for Free Users */}
              {subscription?.plan_type === 'free' && (
                <button
                  onClick={() => {
                    onUpgradeClick();
                    setIsOpen(false);
                  }}
                  className="w-full mt-3 bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  // Add settings functionality here if needed
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Account Settings</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
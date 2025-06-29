import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Sparkles, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SuccessPageProps {
  onBackToApp: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({ onBackToApp }) => {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onBackToApp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onBackToApp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23F97316%22 fill-opacity=%220.03%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-green-200/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-orange-200/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-purple-200/20 rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute bottom-40 right-10 w-16 h-16 bg-green-300/20 rounded-full blur-xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-green-200/50 p-8 shadow-2xl text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping"></div>
            </div>

            {/* Header */}
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Payment Successful!</h2>
            
            {/* Message */}
            <div className="mb-6">
              <p className="text-gray-600 mb-4 leading-relaxed">
                Thank you for your purchase! Your payment has been processed successfully.
              </p>
              
              {user && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-center space-x-2 text-green-700 mb-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-medium">Welcome to Hot Prompt Pro!</span>
                  </div>
                  <p className="text-sm text-green-600">
                    Your account has been upgraded and you now have access to all premium features.
                  </p>
                </div>
              )}
            </div>

            {/* Features Unlocked */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-left">
              <h4 className="font-medium text-gray-800 mb-3 text-center">What's unlocked:</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Increased prompt generation limits</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Advanced prompt templates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Priority generation speed</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Unlimited saved favorites</span>
                </li>
              </ul>
            </div>

            {/* Auto-redirect notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700">
                Redirecting you back to the app in <strong>{countdown}</strong> seconds...
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={onBackToApp}
                className="w-full bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
              >
                <Home className="w-5 h-5" />
                <span>Continue to App</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <p className="text-xs text-gray-500">
                Start generating amazing prompts with your new plan!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
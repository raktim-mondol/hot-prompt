import React from 'react';
import { Flame, Bookmark, CreditCard, UserPlus } from 'lucide-react';
import { UserProfile } from './UserProfile';

interface HeaderProps {
  activeTab: 'generate' | 'saved' | 'pricing';
  setActiveTab: (tab: 'generate' | 'saved' | 'pricing') => void;
  user: any;
  onAuthClick: () => void;
  onUpgradeClick: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  user, 
  onAuthClick,
  onUpgradeClick,
  onSignOut
}) => {
  return (
    <header className="bg-white/60 backdrop-blur-xl border-b border-orange-200/50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Hot Prompt</h1>
              <p className="text-gray-600 text-sm">Create perfect prompts for any AI task</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Navigation - Only show when user is authenticated */}
            {user && (
              <nav className="flex space-x-1 bg-orange-100/50 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('generate')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'generate'
                      ? 'bg-white text-orange-600 shadow-lg'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'
                  }`}
                >
                  <Flame className="w-4 h-4 inline mr-2" />
                  Generate
                </button>
                
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'saved'
                      ? 'bg-white text-orange-600 shadow-lg'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'
                  }`}
                >
                  <Bookmark className="w-4 h-4 inline mr-2" />
                  Saved
                </button>

                <button
                  onClick={() => setActiveTab('pricing')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'pricing'
                      ? 'bg-white text-orange-600 shadow-lg'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Pricing
                </button>
              </nav>
            )}

            {/* User Menu */}
            <div className={`flex items-center ${user ? 'pl-4 border-l border-orange-200' : ''}`}>
              {user ? (
                <UserProfile onUpgradeClick={onUpgradeClick} onSignOut={onSignOut} />
              ) : (
                <button
                  onClick={onAuthClick}
                  className="bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 shadow-lg text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
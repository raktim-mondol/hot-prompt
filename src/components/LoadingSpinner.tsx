import React from 'react';
import { Flame } from 'lucide-react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-orange-200/50 p-12 shadow-lg">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin border-t-orange-500"></div>
          <Flame className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Generating Your Prompts</h3>
          <p className="text-gray-600 text-sm">AI is crafting the perfect prompts for you...</p>
        </div>

        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Flame, Info } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  onGenerate,
  isLoading
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const maxLength = 500;
  const remainingChars = maxLength - value.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onGenerate();
      }
    }
  };

  // Detect if user is on Mac or Windows/Linux for display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? '⌘' : 'Ctrl';

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-orange-200/50 p-8 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Describe Your Prompt</h2>
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-gray-500 hover:text-orange-600 transition-colors"
          >
            <Info className="w-5 h-5" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-8 bg-gray-800/90 backdrop-blur-sm text-white text-sm rounded-lg p-3 w-64 z-10">
              <p>Describe what kind of prompt you need. Be specific about:</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• The purpose or goal</li>
                <li>• Target audience</li>
                <li>• Tone and style</li>
                <li>• Key requirements</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., a professional email template for customer outreach, a creative story about space exploration, a technical documentation guide..."
            className="w-full h-32 bg-white/80 border border-orange-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-transparent resize-none"
            maxLength={maxLength}
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-500">
            <span className={remainingChars < 50 ? 'text-orange-500' : remainingChars < 20 ? 'text-red-500' : ''}>
              {remainingChars}
            </span> characters remaining
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Press <kbd className="px-2 py-1 bg-orange-100 rounded text-xs">{shortcutKey}</kbd> + <kbd className="px-2 py-1 bg-orange-100 rounded text-xs">Enter</kbd> to generate
          </p>
          
          <button
            onClick={onGenerate}
            disabled={isLoading || !value.trim()}
            className="bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center space-x-2 shadow-lg"
          >
            <Flame className={`w-4 h-4 ${isLoading ? 'animate-pulse' : ''}`} />
            <span>{isLoading ? 'Generating...' : 'Generate Prompts'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
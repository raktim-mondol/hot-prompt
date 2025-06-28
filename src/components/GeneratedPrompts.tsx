import React, { useState } from 'react';
import { Copy, Heart, Check, BookmarkPlus, Terminal } from 'lucide-react';
import { Prompt } from '../App';

interface GeneratedPromptsProps {
  prompts: Prompt[];
  onSave: (prompt: Prompt) => void;
  savedPromptIds: string[];
}

export const GeneratedPrompts: React.FC<GeneratedPromptsProps> = ({
  prompts,
  onSave,
  savedPromptIds
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const isSaved = (promptId: string) => savedPromptIds.includes(promptId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Generated Prompt</h3>
        <div className="text-sm text-gray-600">
          Ready to use
        </div>
      </div>

      <div className="grid gap-6">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden shadow-2xl"
          >
            {/* Code editor header */}
            <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <Terminal className="w-4 h-4" />
                  <span className="text-sm font-medium">prompt.txt</span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleCopy(prompt.content, prompt.id)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200 group"
                  title="Copy to clipboard"
                >
                  {copiedId === prompt.id ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => onSave(prompt)}
                  disabled={isSaved(prompt.id)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isSaved(prompt.id)
                      ? 'text-orange-400 bg-orange-500/20 cursor-not-allowed'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                  title={isSaved(prompt.id) ? 'Already saved' : 'Save to favorites'}
                >
                  {isSaved(prompt.id) ? (
                    <Heart className="w-4 h-4 fill-current" />
                  ) : (
                    <BookmarkPlus className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Code content */}
            <div className="p-6 bg-gray-900">
              <div className="flex">
                {/* Line numbers */}
                <div className="text-gray-500 text-sm font-mono mr-4 select-none">
                  {prompt.content.split('\n').map((_, index) => (
                    <div key={index} className="leading-6">
                      {index + 1}
                    </div>
                  ))}
                </div>
                
                {/* Code content */}
                <div className="flex-1">
                  <pre className="text-gray-100 text-sm font-mono leading-6 whitespace-pre-wrap break-words">
                    {prompt.content}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer with copy status */}
            {copiedId === prompt.id && (
              <div className="bg-green-900/30 border-t border-green-700/50 px-4 py-2">
                <div className="flex items-center space-x-2 text-green-400 text-xs font-medium">
                  <Check className="w-3 h-3" />
                  <span>Copied to clipboard!</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
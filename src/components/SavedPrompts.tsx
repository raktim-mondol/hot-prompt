import React, { useState } from 'react';
import { Copy, Trash2, Check, Heart, Terminal } from 'lucide-react';
import { Prompt } from '../App';

interface SavedPromptsProps {
  prompts: Prompt[];
  onRemove: (promptId: string) => void;
}

export const SavedPrompts: React.FC<SavedPromptsProps> = ({ prompts, onRemove }) => {
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (prompts.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-orange-200/50 p-12 text-center shadow-lg">
        <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Saved Prompts</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Start generating prompts and save your favorites to build your personal collection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Saved Prompts</h3>
        <div className="text-sm text-gray-600">
          {prompts.length} saved prompt{prompts.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {/* Code editor header */}
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">saved-prompt.txt</span>
                </div>
                <div className="text-xs text-slate-500">
                  {formatDate(prompt.timestamp)}
                </div>
              </div>
              
              <div className="flex space-x-1">
                <button
                  onClick={() => handleCopy(prompt.content, prompt.id)}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-all duration-200 group"
                  title="Copy to clipboard"
                >
                  {copiedId === prompt.id ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => onRemove(prompt.id)}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200"
                  title="Remove from saved"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Code content - More condensed */}
            <div className="p-4 bg-slate-50">
              <div className="flex">
                {/* Line numbers - smaller and more condensed */}
                <div className="text-slate-400 text-xs font-mono mr-3 select-none leading-5">
                  {prompt.content.split('\n').map((_, index) => (
                    <div key={index}>
                      {index + 1}
                    </div>
                  ))}
                </div>
                
                {/* Code content - more condensed */}
                <div className="flex-1">
                  <pre className="text-slate-700 text-xs font-mono leading-5 whitespace-pre-wrap break-words">
                    {prompt.content}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer with copy status */}
            {copiedId === prompt.id && (
              <div className="bg-green-50 border-t border-green-200 px-4 py-2">
                <div className="flex items-center space-x-2 text-green-700 text-xs font-medium">
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
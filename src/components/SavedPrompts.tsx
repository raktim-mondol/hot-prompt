import React, { useState } from 'react';
import { Copy, Trash2, Check, Heart } from 'lucide-react';
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
            className="bg-white/70 backdrop-blur-xl rounded-xl border border-orange-200/50 p-6 hover:bg-white/80 transition-all duration-200 group shadow-lg"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-orange-500 fill-current" />
                <span className="text-xs text-gray-600">
                  Saved on {formatDate(prompt.timestamp)}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleCopy(prompt.content, prompt.id)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-orange-100 rounded-lg transition-all duration-200"
                  title="Copy to clipboard"
                >
                  {copiedId === prompt.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => onRemove(prompt.id)}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-100 rounded-lg transition-all duration-200"
                  title="Remove from saved"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-gray-700 leading-relaxed text-sm">
              {prompt.content}
            </p>

            {copiedId === prompt.id && (
              <div className="mt-3 text-xs text-green-600 font-medium">
                ✓ Copied to clipboard!
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthForm } from './components/AuthForm';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { GeneratedPrompts } from './components/GeneratedPrompts';
import { SavedPrompts } from './components/SavedPrompts';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';

export interface Prompt {
  id: string;
  content: string;
  timestamp: number;
  isFavorite?: boolean;
  userId?: string;
}

function App() {
  const { user, loading: authLoading } = useAuth();
  const [input, setInput] = useState('');
  const [generatedPrompts, setGeneratedPrompts] = useState<Prompt[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
  const [showAuthPage, setShowAuthPage] = useState(false);

  // Load saved prompts from localStorage on mount and when user changes
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`savedPrompts_${user.id}`);
      if (saved) {
        setSavedPrompts(JSON.parse(saved));
      }
    } else {
      // Clear saved prompts when user signs out
      setSavedPrompts([]);
    }
  }, [user]);

  // Clear generated prompts when user signs out
  useEffect(() => {
    if (!user) {
      setGeneratedPrompts([]);
      setActiveTab('generate'); // Reset to generate tab
    }
  }, [user]);

  // Save prompts to localStorage whenever savedPrompts changes
  useEffect(() => {
    if (user && savedPrompts.length >= 0) {
      localStorage.setItem(`savedPrompts_${user.id}`, JSON.stringify(savedPrompts));
    }
  }, [savedPrompts, user]);

  const handleGenerate = async () => {
    if (!input.trim()) {
      setError('Please enter a prompt description');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      setShowAuthPage(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call with realistic delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock prompts based on input
      const mockPrompts = generateMockPrompts(input);
      setGeneratedPrompts(mockPrompts);
    } catch (err) {
      setError('Failed to generate prompts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockPrompts = (inputText: string): Prompt[] => {
    const promptTemplates = [
      `Create a detailed and engaging ${inputText} that captures the user's attention while maintaining professional standards and clear communication.`,
      `Design an innovative ${inputText} solution that incorporates modern best practices and user-centered design principles for optimal results.`,
      `Develop a comprehensive ${inputText} strategy that addresses key objectives while considering user experience and technical feasibility.`,
      `Build a creative ${inputText} approach that combines functionality with aesthetic appeal and ensures accessibility across all platforms.`
    ];

    // Select a random template for variety
    const randomTemplate = promptTemplates[Math.floor(Math.random() * promptTemplates.length)];

    return [{
      id: `prompt-${Date.now()}`,
      content: randomTemplate,
      timestamp: Date.now(),
      userId: user?.id
    }];
  };

  const handleSavePrompt = (prompt: Prompt) => {
    // Check if user is authenticated
    if (!user) {
      setShowAuthPage(true);
      return;
    }

    const updatedPrompt = { ...prompt, isFavorite: true, userId: user?.id };
    setSavedPrompts(prev => {
      const existing = prev.find(p => p.id === prompt.id);
      if (existing) return prev;
      return [updatedPrompt, ...prev];
    });
  };

  const handleRemoveSaved = (promptId: string) => {
    setSavedPrompts(prev => prev.filter(p => p.id !== promptId));
  };

  const handleTabChange = (tab: 'generate' | 'saved') => {
    // Check if user is authenticated for saved tab
    if (tab === 'saved' && !user) {
      setShowAuthPage(true);
      return;
    }
    setActiveTab(tab);
  };

  const clearError = () => setError(null);

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth form if explicitly requested
  if (showAuthPage) {
    return <AuthForm onBack={() => setShowAuthPage(false)} />;
  }

  // Show main app (no longer checking for user authentication)
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23F97316%22 fill-opacity=%220.03%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      <div className="relative z-10">
        <Header 
          activeTab={activeTab} 
          setActiveTab={handleTabChange}
          user={user}
          onAuthClick={() => setShowAuthPage(true)}
        />
        
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          {error && (
            <ErrorMessage message={error} onClear={clearError} />
          )}

          {activeTab === 'generate' ? (
            <div className="space-y-8">
              <PromptInput
                value={input}
                onChange={setInput}
                onGenerate={handleGenerate}
                isLoading={isLoading}
              />

              {isLoading && <LoadingSpinner />}

              {generatedPrompts.length > 0 && !isLoading && user && (
                <GeneratedPrompts
                  prompts={generatedPrompts}
                  onSave={handleSavePrompt}
                  savedPromptIds={savedPrompts.map(p => p.id)}
                />
              )}
            </div>
          ) : (
            <SavedPrompts
              prompts={savedPrompts}
              onRemove={handleRemoveSaved}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
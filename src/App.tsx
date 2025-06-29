import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useSubscription } from './hooks/useSubscription';
import { AuthForm } from './components/AuthForm';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { GeneratedPrompts } from './components/GeneratedPrompts';
import { SavedPrompts } from './components/SavedPrompts';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { UsageIndicator } from './components/UsageIndicator';
import { PricingSection } from './components/PricingSection';
import { SuccessPage } from './components/SuccessPage';

export interface Prompt {
  id: string;
  content: string;
  timestamp: number;
  isFavorite?: boolean;
  userId?: string;
}

function App() {
  const { user, loading: authLoading } = useAuth();
  const { 
    subscription, 
    canGeneratePrompt, 
    incrementUsage, 
    getRemainingPrompts,
    isSubscriptionActive,
    refetch: refetchSubscription
  } = useSubscription();
  
  const [input, setInput] = useState('');
  const [generatedPrompts, setGeneratedPrompts] = useState<Prompt[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'saved' | 'pricing'>('generate');
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [showSuccessPage, setShowSuccessPage] = useState(false);

  // Check for success parameter in URL or success path
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const currentPath = window.location.pathname;
    
    // Check if we're on the success page or have success parameters
    if (sessionId || currentPath === '/success' || urlParams.get('success') === 'true') {
      console.log('Payment success detected, showing success page');
      setShowSuccessPage(true);
      
      // Clean up URL without causing a page reload
      const cleanUrl = window.location.origin + window.location.pathname.replace('/success', '/');
      window.history.replaceState({}, document.title, cleanUrl);
      
      // Refetch subscription data after successful payment
      if (user) {
        setTimeout(() => {
          console.log('Refetching subscription data after payment');
          refetchSubscription();
        }, 2000); // Give some time for webhook to process
      }
    }
  }, [user, refetchSubscription]);

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

  // Handle OAuth callback - check for auth state changes
  useEffect(() => {
    // If user just signed in via OAuth and showAuthPage is true, close it
    if (user && showAuthPage) {
      setShowAuthPage(false);
    }
  }, [user, showAuthPage]);

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

    // Check if user can generate prompts (usage limits, subscription status)
    const canGenerate = await canGeneratePrompt();
    if (!canGenerate) {
      const remainingPrompts = getRemainingPrompts();
      if (remainingPrompts === 0) {
        setError('You have reached your prompt limit. Please upgrade your plan to continue.');
        setActiveTab('pricing');
      } else if (!isSubscriptionActive()) {
        setError('Your subscription is not active. Please check your payment method or upgrade your plan.');
        setActiveTab('pricing');
      } else {
        setError('Unable to generate prompts at this time. Please try again later.');
      }
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

      // Increment usage count
      const success = await incrementUsage();
      if (!success) {
        console.warn('Failed to increment usage count');
      }
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

  const handleTabChange = (tab: 'generate' | 'saved' | 'pricing') => {
    // Check if user is authenticated for saved and pricing tabs
    if ((tab === 'saved' || tab === 'pricing') && !user) {
      setShowAuthPage(true);
      return;
    }
    setActiveTab(tab);
  };

  const clearError = () => setError(null);

  const handleBackToApp = () => {
    console.log('Returning to main app from success page');
    setShowSuccessPage(false);
    setActiveTab('generate');
    // Refetch subscription data to get updated limits
    refetchSubscription();
  };

  // Show success page first (highest priority)
  if (showSuccessPage) {
    return <SuccessPage onBackToApp={handleBackToApp} />;
  }

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

  // Show main app
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

          {/* Usage Indicator - Show when user is logged in */}
          {user && (
            <div className="mb-6">
              <UsageIndicator onUpgradeClick={() => setActiveTab('pricing')} />
            </div>
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
          ) : activeTab === 'saved' ? (
            <SavedPrompts
              prompts={savedPrompts}
              onRemove={handleRemoveSaved}
            />
          ) : (
            <PricingSection
              currentPlan={subscription?.plan_type}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
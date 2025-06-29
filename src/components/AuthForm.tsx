import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Flame, Sparkles, Zap, Star, ArrowLeft, CheckCircle, Github } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthFormProps {
  onBack?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showEmailSent, setShowEmailSent] = useState(false);

  const { signIn, signUp, signInWithGitHub, user } = useAuth();

  // Auto-close auth form when user signs in (handles OAuth callback)
  useEffect(() => {
    if (user && onBack) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        onBack();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, onBack]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else if (onBack) {
          onBack(); // Go back to main app after successful login
        }
      } else {
        const { data, error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          // Check if user needs email confirmation
          if (data.user && !data.session) {
            // Email confirmation is required
            setShowEmailSent(true);
            setMessage('Please check your email and click the confirmation link to complete your registration.');
          } else if (data.session) {
            // User is immediately signed in (email confirmation disabled)
            if (onBack) {
              onBack();
            }
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setGithubLoading(true);
    setError(null);

    try {
      const { error } = await signInWithGitHub();
      if (error) {
        setError(error.message);
        setGithubLoading(false);
      }
      // Note: For OAuth, the redirect happens automatically
      // The user will be redirected back to the app after authentication
      // Don't set githubLoading to false here as the page will redirect
    } catch (err) {
      setError('Failed to sign in with GitHub');
      setGithubLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setMessage(null);
    setShowEmailSent(false);
  };

  const handleBackToLogin = () => {
    setShowEmailSent(false);
    setIsLogin(true);
    setError(null);
    setMessage(null);
  };

  // Show email confirmation screen
  if (showEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23F97316%22 fill-opacity=%220.03%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
        
        {/* Back Button */}
        {onBack && (
          <div className="absolute top-6 left-6 z-20">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to App</span>
            </button>
          </div>
        )}

        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-orange-200/50 p-8 shadow-2xl text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              {/* Header */}
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email</h2>
              
              {/* Message */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                We've sent a confirmation link to <strong>{email}</strong>. 
                Please click the link in your email to verify your account and complete the registration process.
              </p>

              {/* Instructions */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-left">
                <h4 className="font-medium text-gray-800 mb-2">What to do next:</h4>
                <ol className="text-sm text-gray-600 space-y-1">
                  <li>1. Check your email inbox</li>
                  <li>2. Look for an email from Hot Prompt</li>
                  <li>3. Click the confirmation link</li>
                  <li>4. Return here to sign in</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleBackToLogin}
                  className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
                >
                  <User className="w-5 h-5" />
                  <span>Back to Sign In</span>
                </button>
                
                <p className="text-xs text-gray-500">
                  Didn't receive the email? Check your spam folder or try signing up again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23F97316%22 fill-opacity=%220.03%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-orange-200/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-rose-200/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-amber-200/20 rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute bottom-40 right-10 w-16 h-16 bg-orange-300/20 rounded-full blur-xl animate-pulse delay-700"></div>
      </div>

      {/* Back Button */}
      {onBack && (
        <div className="absolute top-6 left-6 z-20">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to App</span>
          </button>
        </div>
      )}

      <div className="relative z-10 flex min-h-screen">
        {/* Left Side - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16">
          <div className="max-w-lg">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <Flame className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Hot Prompt</h1>
                <p className="text-gray-600">AI Prompt Generator</p>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-gray-800 mb-6 leading-tight">
              Create Perfect Prompts for Any AI Task
            </h2>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Transform your ideas into powerful AI prompts. Generate, save, and organize 
              your prompt collection with our intelligent prompt generator.
            </p>

            {/* Feature List */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-gray-700">AI-powered prompt generation</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-gray-700">Save and organize favorites</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-gray-700">Instant copy-to-clipboard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Hot Prompt</h1>
              <p className="text-gray-600">Create perfect AI prompts</p>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-orange-200/50 p-8 shadow-2xl">
              {/* Form Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {isLogin ? 'Welcome Back!' : 'Join Hot Prompt'}
                </h2>
                <p className="text-gray-600">
                  {isLogin 
                    ? 'Sign in to access your saved prompts' 
                    : 'Create an account to start generating prompts'
                  }
                </p>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <p className="text-red-700 text-sm flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    {error}
                  </p>
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <p className="text-green-700 text-sm flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {message}
                  </p>
                </div>
              )}

              {/* GitHub Sign In Button */}
              <div className="mb-6">
                <button
                  onClick={handleGitHubSignIn}
                  disabled={githubLoading || loading}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  {githubLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Connecting to GitHub...</span>
                    </>
                  ) : (
                    <>
                      <Github className="w-5 h-5" />
                      <span>Continue with GitHub</span>
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-orange-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/70 text-gray-500">or continue with email</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-12 py-3 bg-white/80 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {!isLogin && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                      <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                      Password must be at least 6 characters long
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || githubLoading}
                  className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                    </>
                  ) : (
                    <>
                      {isLogin ? <User className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
                      <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Mode */}
              <div className="mt-8 text-center">
                <p className="text-gray-600 text-sm">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}
                </p>
                <button
                  onClick={toggleMode}
                  className="mt-2 text-orange-600 hover:text-orange-700 font-medium transition-colors hover:underline"
                >
                  {isLogin ? 'Create a new account' : 'Sign in to existing account'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500">
                By continuing, you agree to our terms of service and privacy policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
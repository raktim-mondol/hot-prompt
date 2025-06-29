import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Flame, Sparkles, Zap, Star, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setShowVerificationMessage(false);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          // Handle specific error cases
          if (error.message.includes('Email not confirmed')) {
            setError('Please check your email and click the verification link before signing in.');
          } else if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please check your credentials and try again.');
          } else {
            setError(error.message);
          }
        } else if (onBack) {
          onBack(); // Go back to main app after successful login
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('An account with this email already exists. Please sign in instead.');
          } else {
            setError(error.message);
          }
        } else {
          setShowVerificationMessage(true);
          setMessage('Account created successfully! Please check your email for a verification link.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setMessage(null);
    setShowVerificationMessage(false);
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await signUp(email, password);
      if (error && !error.message.includes('User already registered')) {
        setError(error.message);
      } else {
        setMessage('Verification email sent! Please check your inbox.');
      }
    } catch (err) {
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              {/* Verification Success Message */}
              {showVerificationMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-center">
                  <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Check Your Email!</h3>
                  <p className="text-blue-700 text-sm mb-4">
                    We've sent a verification link to <strong>{email}</strong>. 
                    Please click the link in your email to verify your account before signing in.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => setIsLogin(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Go to Sign In
                    </button>
                    <button
                      onClick={handleResendVerification}
                      disabled={loading}
                      className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Resend verification email
                    </button>
                  </div>
                </div>
              )}

              {!showVerificationMessage && (
                <>
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
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-red-700 text-sm font-medium mb-1">Authentication Error</p>
                          <p className="text-red-600 text-sm">{error}</p>
                          {error.includes('Email not confirmed') && (
                            <button
                              onClick={handleResendVerification}
                              disabled={loading}
                              className="mt-2 text-red-700 hover:text-red-800 text-sm font-medium underline disabled:opacity-50"
                            >
                              Resend verification email
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {message && !showVerificationMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <p className="text-green-700 text-sm font-medium">{message}</p>
                      </div>
                    </div>
                  )}

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
                      disabled={loading}
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
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-orange-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white/70 text-gray-500">or</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mt-4">
                      {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    </p>
                    <button
                      onClick={toggleMode}
                      className="mt-2 text-orange-600 hover:text-orange-700 font-medium transition-colors hover:underline"
                    >
                      {isLogin ? 'Create a new account' : 'Sign in to existing account'}
                    </button>
                  </div>
                </>
              )}
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
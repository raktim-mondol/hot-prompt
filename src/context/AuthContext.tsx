import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>;
  signIn: (email: string, password: string, rememberDevice?: boolean) => Promise<{ error: AuthError | null }>;
  signInWithGitHub: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to ensure user has required database records
  const ensureUserRecords = async (userId: string) => {
    try {
      console.log('Ensuring user records exist for:', userId);
      
      // Call the robust database function to check and create records if needed
      const { data, error } = await supabase.rpc('ensure_user_records_robust', {
        user_uuid: userId
      });

      if (error) {
        console.error('Error ensuring user records:', error);
        
        // Fallback: try the simpler function
        const { error: fallbackError } = await supabase.rpc('ensure_user_records', {
          user_uuid: userId
        });
        
        if (fallbackError) {
          console.error('Fallback user record creation failed:', fallbackError);
        } else {
          console.log('Successfully created user records via fallback');
        }
      } else {
        console.log('User records verified/created:', data);
      }
    } catch (err) {
      console.error('Error in ensureUserRecords:', err);
    }
  };

  // Helper function to clean up URL hash after auth
  const cleanupUrlHash = () => {
    if (window.location.hash && (
      window.location.hash.includes('access_token') || 
      window.location.hash.includes('refresh_token') ||
      window.location.hash.includes('type=signup') ||
      window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('type=magiclink') ||
      window.location.hash.includes('provider_token')
    )) {
      // Clean up the URL hash while preserving query parameters
      const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
      window.history.replaceState(null, '', cleanUrl);
      console.log('Cleaned up OAuth URL hash');
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // First, check if there's a session in the URL hash (from OAuth callback or email confirmation)
        // This is crucial for handling redirects from Supabase
        const { data: sessionFromUrl, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session from URL:', sessionError);
        }

        // If we have a session from the URL, use it
        if (sessionFromUrl.session && mounted) {
          console.log('Found session from URL callback');
          setSession(sessionFromUrl.session);
          setUser(sessionFromUrl.session.user);
          
          // Ensure user has database records
          await ensureUserRecords(sessionFromUrl.session.user.id);
          
          // Clean up the URL hash immediately after successful session retrieval
          cleanupUrlHash();
        } else {
          // No session in URL, check for existing session
          console.log('No session in URL, checking for existing session');
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'No user');
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle successful authentication events
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          // Ensure user has database records
          await ensureUserRecords(session.user.id);
          
          // Clean up URL hash after successful OAuth sign in or email confirmation
          cleanupUrlHash();
          
          // Log successful authentication
          const provider = session.user?.app_metadata?.provider;
          if (provider === 'github') {
            console.log('Successfully signed in with GitHub');
          } else if (provider === 'email') {
            console.log('Successfully signed in with email');
          }
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setSession(null);
          setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    console.log('Attempting to sign up with email:', email);
    
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      // If sign up was successful but user needs email confirmation
      if (result.data.user && !result.error) {
        console.log('Sign up successful, user created:', result.data.user.id);
        
        // Try to ensure user records are created even if trigger fails
        if (result.data.user.id) {
          // Small delay to let the trigger run first, then ensure records exist
          setTimeout(async () => {
            await ensureUserRecords(result.data.user!.id);
          }, 2000);
        }
      }

      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string, rememberDevice: boolean = true) => {
    console.log('Attempting to sign in with email:', email, 'Remember device:', rememberDevice);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If sign in was successful and we want to control persistence
    if (!error && !rememberDevice) {
      // For session-only persistence, we need to update the session storage
      // This will make the session expire when the browser tab is closed
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Store in sessionStorage instead of localStorage
          sessionStorage.setItem('supabase.auth.token', JSON.stringify(session));
          localStorage.removeItem('supabase.auth.token');
        }
      } catch (storageError) {
        console.warn('Could not update session storage:', storageError);
      }
    }

    return { error };
  };

  const signInWithGitHub = async () => {
    console.log('Attempting to sign in with GitHub...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    
    if (error) {
      console.error('GitHub OAuth error:', error);
    } else {
      console.log('GitHub OAuth initiated successfully');
    }
    
    return { error };
  };

  const signOut = async () => {
    console.log('Signing out...');
    
    try {
      // Clear any local storage
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('supabase.auth.token');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return { error };
      }
      
      // Force clear state immediately
      setUser(null);
      setSession(null);
      
      console.log('Successfully signed out');
      return { error: null };
    } catch (err) {
      console.error('Unexpected sign out error:', err);
      return { error: err as AuthError };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGitHub,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
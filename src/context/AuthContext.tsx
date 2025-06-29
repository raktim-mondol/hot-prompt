import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
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

  // Helper function to clean up URL hash
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
        
        // Check if there's a session in the URL (from OAuth callback or email confirmation)
        const { data, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) {
            console.error('Error getting session:', error);
          } else {
            console.log('Session data:', data.session ? 'Session found' : 'No session');
            setSession(data.session);
            setUser(data.session?.user ?? null);
          }
          setLoading(false);
        }

        // Clean up URL hash if it contains auth tokens
        cleanupUrlHash();
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
    const result = await supabase.auth.signUp({
      email,
      password,
    });
    return result;
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in with email:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
    return { error };
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
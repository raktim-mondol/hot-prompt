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

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check if there's a session in the URL (from OAuth callback or email confirmation)
        const { data, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) {
            console.error('Error getting session:', error);
          } else {
            setSession(data.session);
            setUser(data.session?.user ?? null);
          }
          setLoading(false);
        }

        // Clean up URL hash if it contains auth tokens
        if (window.location.hash && window.location.hash.includes('access_token')) {
          // Use replaceState to remove the hash without triggering a page reload
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
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
      console.log('Auth state changed:', event, session);
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle successful sign in events
        if (event === 'SIGNED_IN' && session) {
          // Clean up URL hash after successful OAuth sign in or email confirmation
          if (window.location.hash && (
            window.location.hash.includes('access_token') || 
            window.location.hash.includes('type=signup') ||
            window.location.hash.includes('type=recovery')
          )) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session);
          setUser(session.user);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const result = await supabase.auth.signUp({
      email,
      password,
    });
    return result;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
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
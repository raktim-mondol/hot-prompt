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
        
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
        }

        if (sessionData.session && mounted) {
          console.log('Found existing session for user:', sessionData.session.user.email);
          setSession(sessionData.session);
          setUser(sessionData.session.user);
          cleanupUrlHash();
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
          cleanupUrlHash();
          
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

      if (result.data.user && !result.error) {
        console.log('Sign up successful, user created:', result.data.user.id);
      }

      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string, rememberDevice: boolean = true) => {
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
    
    try {
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
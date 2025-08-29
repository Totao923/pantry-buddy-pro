import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { createSupabaseClient } from '../supabase/client';
import { dataMigrationService } from '../migration/dataMigration';
import { ingredientService } from '../services/ingredientService';
import { ingredientServiceFactory } from '../services/ingredientServiceFactory';
import type { Database } from '../supabase/types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
type Subscription = Database['public']['Tables']['subscriptions']['Row'];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  subscription: Subscription | null;
  session: Session | null;
  loading: boolean;
  supabaseClient: any;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<{ error: any }>;
  refreshUserData: () => Promise<void>;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading to check auth state

  const router = useRouter();
  const supabaseRef = useRef(createSupabaseClient());
  const supabase = supabaseRef.current;

  // If no Supabase client (demo mode), provide mock functions
  const isDemo = !supabase;

  console.log('AuthProvider initialized:', { isDemo, hasSupabase: !!supabase });

  useEffect(() => {
    // Add reasonable timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Auth loading timeout - setting loading to false');
      setLoading(false);
    }, 3000); // Reduced to 3 seconds

    // Skip auth setup if no Supabase client (demo mode)
    if (!supabase) {
      console.log('No Supabase client detected - using demo mode');
      clearTimeout(loadingTimeout);
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          clearTimeout(loadingTimeout);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Load user data immediately for faster UI response
          loadUserData(session.user.id);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('Auth state changed:', event, session?.user?.id);

      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session?.user) {
        // Load user data immediately for faster UI response
        loadUserData(session.user.id);

        // Switch to database services in background
        ingredientServiceFactory
          .switchToDatabaseService()
          .then(switched => console.log('Service switch result:', switched ? 'database' : 'mock'))
          .catch(error => console.error('Error switching to database service:', error));

        // Reset ingredients in background - don't block UI
        ingredientService
          .clearAllIngredients()
          .then(() => console.log('Ingredients reset on sign-in'))
          .catch(error => console.error('Error resetting ingredients on sign-in:', error));

        // Redirect to dashboard after successful sign-in
        // Only redirect if not already on dashboard or auth pages
        if (
          router.pathname !== '/dashboard' &&
          !router.pathname.startsWith('/dashboard/') &&
          router.pathname !== '/auth/callback'
        ) {
          console.log('Redirecting to dashboard after sign-in');
          router.push('/dashboard');
        }
      } else if (event === 'SIGNED_OUT') {
        // Switch back to mock service when user signs out
        ingredientServiceFactory.switchToMockService();
        console.log('Switched back to mock service after sign-out');

        setProfile(null);
        setPreferences(null);
        setSubscription(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [supabase]);

  const loadUserData = async (userId: string) => {
    // Skip if no Supabase client (demo mode)
    if (!supabase) {
      console.log('Skipping loadUserData - no Supabase client');
      return;
    }

    try {
      // Don't set loading to true here - let the UI be responsive
      console.log('Loading user data in background for userId:', userId);

      // Add timeout for database operations
      const dataTimeout = setTimeout(() => {
        console.log('User data loading timeout - operation completed');
      }, 3000); // Reduced to 3 seconds

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      } else {
        setProfile(profileData);
      }

      // Load user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        console.error('Error loading preferences:', preferencesError);
      } else {
        setPreferences(preferencesData);
      }

      // Load subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('Error loading subscription:', subscriptionError);
      } else {
        setSubscription(subscriptionData);
      }

      // Check for data migration after loading user data
      try {
        const needsMigration = await dataMigrationService.needsMigration(userId);
        if (needsMigration) {
          console.log('Local data detected, migration available');
          // The migration banner will handle prompting the user
        }
      } catch (error) {
        console.error('Error checking migration status:', error);
      }

      clearTimeout(dataTimeout);
      console.log('User data loading completed successfully');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    // Don't call setLoading(false) here - let auth state handle loading
  };

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    // Debug logging for production issues
    console.log('SignUp Debug:', {
      isDemo,
      hasSupabase: !!supabase,
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    // Only block if we're in demo mode (no Supabase client) AND in production
    if (isDemo && process.env.NODE_ENV === 'production') {
      console.error('Blocking: Demo mode not allowed in production');
      return { error: new Error('Authentication service unavailable. Please contact support.') };
    }

    // If in demo mode but not production, allow demo auth
    if (isDemo) {
      console.log('Using demo mode authentication');
      return { error: null };
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: metadata.name || '',
            ...metadata,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { error };
      }

      // User data will be loaded automatically via onAuthStateChange
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    // Debug logging for production issues
    console.log('SignIn Debug:', {
      isDemo,
      hasSupabase: !!supabase,
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    // Only block if we're in demo mode (no Supabase client) AND in production
    if (isDemo && process.env.NODE_ENV === 'production') {
      console.error('Blocking: Demo mode not allowed in production');
      return { error: new Error('Authentication service unavailable. Please contact support.') };
    }

    // If in demo mode but not production, allow demo auth
    if (isDemo) {
      console.log('Using demo mode authentication');

      // Reset ingredients on demo sign-in
      try {
        await ingredientService.clearAllIngredients();
        console.log('Ingredients reset on demo sign-in');
      } catch (error) {
        console.error('Error resetting ingredients on demo sign-in:', error);
      }

      // Removed artificial delay for better performance

      // Set a mock user for demo mode
      const mockUser = {
        id: 'demo-user-123',
        email: email,
        user_metadata: { name: 'Demo User' },
      } as any;

      setUser(mockUser);
      setSession({ user: mockUser } as any);

      // Redirect to dashboard after successful demo sign-in
      // Only redirect if not already on dashboard
      if (router.pathname !== '/dashboard' && !router.pathname.startsWith('/dashboard/')) {
        console.log('Redirecting to dashboard after demo sign-in');
        router.push('/dashboard'); // Removed artificial delay
      }

      return { error: null };
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // User data will be loaded automatically via onAuthStateChange
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (isDemo) {
      // Demo mode - just clear state
      setUser(null);
      setProfile(null);
      setPreferences(null);
      setSubscription(null);
      setSession(null);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();

      if (!error) {
        setUser(null);
        setProfile(null);
        setPreferences(null);
        setSubscription(null);
        setSession(null);
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    if (isDemo) {
      return { error: null };
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { error };
      }

      // OAuth will redirect, so we don't need to handle user data here
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (isDemo) {
      return { error: null };
    }

    // Client-side rate limiting for password reset (3 attempts per 15 minutes)
    const resetKey = `password_reset_${email}`;
    const resetAttempts = JSON.parse(localStorage.getItem(resetKey) || '[]');
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    // Clean old attempts
    const recentAttempts = resetAttempts.filter(
      (timestamp: number) => now - timestamp < fifteenMinutes
    );

    if (recentAttempts.length >= 3) {
      return {
        error: new Error(
          'Too many password reset attempts. Please wait 15 minutes before trying again.'
        ),
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
      });

      if (!error) {
        // Record successful attempt
        recentAttempts.push(now);
        localStorage.setItem(resetKey, JSON.stringify(recentAttempts));
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { error };
      }

      setProfile(data);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { error };
      }

      setPreferences(data);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    preferences,
    subscription,
    session,
    loading,
    supabaseClient: supabase,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword,
    updateProfile,
    updatePreferences,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to get subscription features
export const useSubscriptionFeatures = () => {
  const { subscription } = useAuth();

  const getFeatures = () => {
    const tier = subscription?.tier || 'free';

    switch (tier) {
      case 'free':
        return {
          maxPantryItems: 50,
          dailyRecipeGenerations: 5,
          hasAdvancedAI: false,
          hasNutritionTracking: false,
          hasMealPlanning: false,
          hasPhotoUploads: false,
          hasAdFreeExperience: false,
          maxFamilyMembers: 1,
          hasBarcodeScan: false,
          hasAdvancedInventory: false,
        };
      case 'premium':
        return {
          maxPantryItems: 500,
          dailyRecipeGenerations: 50,
          hasAdvancedAI: true,
          hasNutritionTracking: true,
          hasMealPlanning: true,
          hasPhotoUploads: true,
          hasAdFreeExperience: true,
          maxFamilyMembers: 1,
          hasBarcodeScan: true,
          hasAdvancedInventory: true,
        };
      case 'family':
        return {
          maxPantryItems: 1000,
          dailyRecipeGenerations: 100,
          hasAdvancedAI: true,
          hasNutritionTracking: true,
          hasMealPlanning: true,
          hasPhotoUploads: true,
          hasAdFreeExperience: true,
          maxFamilyMembers: 6,
          hasBarcodeScan: true,
          hasAdvancedInventory: true,
        };
      case 'chef':
        return {
          maxPantryItems: -1, // unlimited
          dailyRecipeGenerations: -1, // unlimited
          hasAdvancedAI: true,
          hasNutritionTracking: true,
          hasMealPlanning: true,
          hasPhotoUploads: true,
          hasAdFreeExperience: true,
          maxFamilyMembers: -1, // unlimited
          hasBarcodeScan: true,
          hasAdvancedInventory: true,
        };
      default:
        return {
          maxPantryItems: 50,
          dailyRecipeGenerations: 5,
          hasAdvancedAI: false,
          hasNutritionTracking: false,
          hasMealPlanning: false,
          hasPhotoUploads: false,
          hasAdFreeExperience: false,
          maxFamilyMembers: 1,
          hasBarcodeScan: false,
          hasAdvancedInventory: false,
        };
    }
  };

  return {
    features: getFeatures(),
    tier: subscription?.tier || 'free',
    status: subscription?.status || 'active',
  };
};

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // セッションの確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) throw signUpError;

    // プロフィールの作成
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: user?.id, username }]);
    
    if (profileError) throw profileError;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // ソーシャルログイン後のプロフィール作成
  const createProfileIfNeeded = async (user: User) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select()
      .eq('id', user.id)
      .single();

    if (!profile) {
      const username = user.email?.split('@')[0] || `user_${Math.random().toString(36).slice(2, 7)}`;
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          username,
          full_name: user.user_metadata.full_name,
          avatar_url: user.user_metadata.avatar_url
        }]);

      if (profileError) throw profileError;
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback`
      }
    });
    if (error) throw error;
  };

  // ソーシャルログイン後のプロフィール作成を監視
  useEffect(() => {
    if (user) {
      createProfileIfNeeded(user).catch(console.error);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── Типы ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Текущая сессия Supabase (null — не авторизован) */
  session: Session | null;
  /** Текущий пользователь Supabase (null — не авторизован) */
  user: User | null;
  /** true пока идёт первоначальная проверка сессии */
  loading: boolean;
  /** Вход по email + пароль */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Регистрация по email + пароль */
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Выход */
  signOut: () => Promise<void>;
}

// ─── Контекст ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Провайдер ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получаем текущую сессию при монтировании
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Подписываемся на изменения состояния аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ─── Методы ──────────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  // ─── Значение контекста ───────────────────────────────────────────────────

  const value: AuthContextValue = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Хук ─────────────────────────────────────────────────────────────────────

/**
 * Хук для доступа к контексту аутентификации.
 * Должен использоваться только внутри <AuthProvider>.
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри <AuthProvider>');
  }
  return context;
};

export default AuthContext;

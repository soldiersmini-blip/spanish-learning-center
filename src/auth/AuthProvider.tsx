import type { Session, User } from '@supabase/supabase-js';
import { createContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { exchangeAuthCallbackIfPresent } from '../lib/supabase/auth';
import { supabase, supabaseConfigStatus } from '../lib/supabase/client';
import type { SupabaseConfigStatus } from '../lib/supabase/types';

export type SyncState = 'local-only' | 'syncing' | 'synced' | 'pending-upload' | 'offline' | 'failed' | 'conflict';

export type AuthContextValue = {
  configStatus: SupabaseConfigStatus;
  user: User | null;
  session: Session | null;
  loading: boolean;
  authMessage: string;
  syncState: SyncState;
  isConfigured: boolean;
  isAuthenticated: boolean;
  setAuthMessage: (message: string) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseConfigStatus === 'configured');
  const [authMessage, setAuthMessage] = useState('');
  const [syncState, setSyncState] = useState<SyncState>(supabaseConfigStatus === 'configured' ? 'local-only' : 'local-only');

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      setLoading(false);
      setSyncState('local-only');
      return undefined;
    }
    const client = supabase;

    async function initAuth() {
      setLoading(true);
      const callback = await exchangeAuthCallbackIfPresent();
      if (callback.error && mounted) setAuthMessage(callback.error);
      const { data } = await client.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user || null);
      setSyncState(data.session ? 'pending-upload' : 'local-only');
      setLoading(false);
    }

    void initAuth();
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user || null);
      setSyncState(nextSession ? 'pending-upload' : 'local-only');
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    configStatus: supabaseConfigStatus,
    user,
    session,
    loading,
    authMessage,
    syncState,
    isConfigured: supabaseConfigStatus === 'configured',
    isAuthenticated: Boolean(user),
    setAuthMessage,
  }), [authMessage, loading, session, syncState, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

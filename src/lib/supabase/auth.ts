import type { Session, User } from '@supabase/supabase-js';
import { humanizeAuthError } from '../../auth/authErrors';
import { getAuthCallbackUrl, supabase } from './client';

export type AuthResult<T = unknown> = {
  data?: T;
  error?: string;
};

function requireSupabase(): AuthResult<never> | null {
  return supabase ? null : { error: '云账号功能尚未配置。请先设置 Supabase 环境变量。' };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
  const client = supabase;
  if (!client) return requireSupabase() || { error: '云账号功能尚未配置。' };
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return error ? { error: humanizeAuthError(error.message) } : { data };
}

export async function signUpWithPassword(email: string, password: string, displayName?: string): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
  const client = supabase;
  if (!client) return requireSupabase() || { error: '云账号功能尚未配置。' };
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthCallbackUrl(),
      data: { display_name: displayName || email.split('@')[0] },
    },
  });
  return error ? { error: humanizeAuthError(error.message) } : { data };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const client = supabase;
  if (!client) return requireSupabase() || { error: '云账号功能尚未配置。' };
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: getAuthCallbackUrl() });
  return error ? { error: humanizeAuthError(error.message) } : { data: true };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const client = supabase;
  if (!client) return requireSupabase() || { error: '云账号功能尚未配置。' };
  const { error } = await client.auth.updateUser({ password });
  return error ? { error: humanizeAuthError(error.message) } : { data: true };
}

export async function signOut(): Promise<AuthResult> {
  const client = supabase;
  if (!client) return requireSupabase() || { error: '云账号功能尚未配置。' };
  const { error } = await client.auth.signOut();
  return error ? { error: humanizeAuthError(error.message) } : { data: true };
}

export async function exchangeAuthCallbackIfPresent() {
  if (!supabase) return { handled: false, error: undefined as string | undefined };
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const isCallback = params.get('auth') === 'callback';
  if (!code && !isCallback) return { handled: false, error: undefined as string | undefined };
  if (!code) return { handled: true, error: '认证回调缺少 code 参数。' };

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  const cleanUrl = `${window.location.pathname}${window.location.hash || '#/account'}`;
  window.history.replaceState({}, '', cleanUrl);
  if (!window.location.hash) window.history.replaceState({}, '', `${window.location.pathname}#/account`);
  return { handled: true, error: error ? humanizeAuthError(error.message) : undefined };
}

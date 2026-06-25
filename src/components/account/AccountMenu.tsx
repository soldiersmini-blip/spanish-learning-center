import { LogOut, UserRound } from 'lucide-react';
import { signOut } from '../../lib/supabase/auth';
import type { RouteId } from '../../navigation/routes';
import { useAuth } from '../../auth/useAuth';
import type { Locale } from '../../types';
import SyncStatus from './SyncStatus';

interface Props {
  onNavigateRoute: (routeId: RouteId) => void;
  locale: Locale;
}

const copy = {
  zh: { login: '登录', register: '注册', guest: '游客', notConfigured: '云账号未配置', center: '个人中心', signOut: '退出登录' },
  en: { login: 'Log in', register: 'Sign up', guest: 'Guest', notConfigured: 'Cloud account not configured', center: 'Account', signOut: 'Sign out' },
  es: { login: 'Entrar', register: 'Registro', guest: 'Invitado', notConfigured: 'Cuenta en la nube no configurada', center: 'Cuenta', signOut: 'Salir' },
} satisfies Record<Locale, Record<string, string>>;

export default function AccountMenu({ onNavigateRoute, locale }: Props) {
  const { user, isAuthenticated, isConfigured, syncState, setAuthMessage } = useAuth();
  const text = copy[locale];
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Guest';

  async function handleSignOut() {
    const result = await signOut();
    if (result.error) setAuthMessage(result.error);
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={() => onNavigateRoute('account-login')} className="rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
          {text.login}
        </button>
        <button type="button" onClick={() => onNavigateRoute('account-register')} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700">
          {text.register}
        </button>
        <button type="button" onClick={() => onNavigateRoute('account')} className="rounded-md px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          {text.guest}
        </button>
        {!isConfigured && <span className="hidden px-2 text-xs font-bold text-amber-700 dark:text-amber-200 xl:inline">{text.notConfigured}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
      <button type="button" onClick={() => onNavigateRoute('account')} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-black text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-28 truncate">{displayName}</span>
      </button>
      <SyncStatus state={syncState} locale={locale} />
      <button type="button" onClick={() => onNavigateRoute('account-sync')} className="rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
        {text.center}
      </button>
      <button type="button" onClick={handleSignOut} className="rounded-md px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
        <LogOut className="h-4 w-4" />
        <span className="sr-only">{text.signOut}</span>
      </button>
      <UserRound className="hidden h-4 w-4 text-slate-400" />
    </div>
  );
}

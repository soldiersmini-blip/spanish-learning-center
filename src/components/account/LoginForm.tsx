import { useState } from 'react';
import type { FormEvent } from 'react';
import { signInWithPassword } from '../../lib/supabase/auth';
import { useAuth } from '../../auth/useAuth';
import type { Locale } from '../../types';

interface Props {
  locale: Locale;
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

const copy = {
  zh: { email: '邮箱', password: '密码', login: '登录', busy: '登录中...', forgot: '忘记密码', missing: '云账号功能尚未配置，当前可继续使用游客模式。', success: '登录成功。' },
  en: { email: 'Email', password: 'Password', login: 'Log in', busy: 'Logging in...', forgot: 'Forgot password', missing: 'Cloud account is not configured. Guest mode remains available.', success: 'Signed in.' },
  es: { email: 'Correo', password: 'Contraseña', login: 'Entrar', busy: 'Entrando...', forgot: 'Olvidé mi contraseña', missing: 'La cuenta en la nube no está configurada. El modo invitado sigue disponible.', success: 'Sesión iniciada.' },
} satisfies Record<Locale, Record<string, string>>;

export default function LoginForm({ locale, onSuccess, onForgotPassword }: Props) {
  const { isConfigured, setAuthMessage } = useAuth();
  const text = copy[locale];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isConfigured) {
      setMessage(text.missing);
      return;
    }
    setBusy(true);
    const result = await signInWithPassword(email, password);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      setAuthMessage(result.error);
      return;
    }
    setMessage(text.success);
    onSuccess?.();
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="login-email">{text.email}</label>
        <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" required />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="login-password">{text.password}</label>
        <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" required minLength={8} />
      </div>
      {!isConfigured && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-100">{text.missing}</p>}
      {message && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{message}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? text.busy : text.login}
        </button>
        <button type="button" onClick={onForgotPassword} className="text-sm font-bold text-brand-700 hover:underline dark:text-brand-100">
          {text.forgot}
        </button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { signUpWithPassword } from '../../lib/supabase/auth';
import { useAuth } from '../../auth/useAuth';
import type { Locale } from '../../types';

const copy = {
  zh: { name: '昵称', email: '邮箱', password: '密码', register: '注册', busy: '提交中...', missing: '云账号功能尚未配置，当前不会创建真实账号。', verify: '注册请求已提交。请检查邮箱完成验证。' },
  en: { name: 'Display name', email: 'Email', password: 'Password', register: 'Sign up', busy: 'Submitting...', missing: 'Cloud account is not configured. No real account will be created.', verify: 'Registration submitted. Please verify your email.' },
  es: { name: 'Nombre visible', email: 'Correo', password: 'Contraseña', register: 'Registro', busy: 'Enviando...', missing: 'La cuenta en la nube no está configurada. No se creará una cuenta real.', verify: 'Registro enviado. Verifica tu correo.' },
} satisfies Record<Locale, Record<string, string>>;

export default function RegisterForm({ locale }: { locale: Locale }) {
  const { isConfigured, setAuthMessage } = useAuth();
  const text = copy[locale];
  const [displayName, setDisplayName] = useState('');
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
    const result = await signUpWithPassword(email, password, displayName);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      setAuthMessage(result.error);
      return;
    }
    setMessage(text.verify);
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="register-name">{text.name}</label>
        <input id="register-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="register-email">{text.email}</label>
        <input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" required />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="register-password">{text.password}</label>
        <input id="register-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" required minLength={8} />
      </div>
      {!isConfigured && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-100">{text.missing}</p>}
      {message && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{message}</p>}
      <button type="submit" disabled={busy} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
        {busy ? text.busy : text.register}
      </button>
    </form>
  );
}

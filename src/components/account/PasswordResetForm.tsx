import { useState } from 'react';
import type { FormEvent } from 'react';
import { requestPasswordReset, updatePassword } from '../../lib/supabase/auth';
import { useAuth } from '../../auth/useAuth';
import type { Locale } from '../../types';

interface Props {
  locale: Locale;
  mode?: 'request' | 'update';
}

const copy = {
  zh: { email: '邮箱', newPassword: '新密码', missing: '云账号功能尚未配置，无法发送密码重置邮件。', missingShort: '云账号功能尚未配置。', updated: '密码已更新。', sent: '如果邮箱存在，你会收到重置密码邮件。', busy: '处理中...', update: '设置新密码', send: '发送重置邮件' },
  en: { email: 'Email', newPassword: 'New password', missing: 'Cloud account is not configured, so password reset email cannot be sent.', missingShort: 'Cloud account is not configured.', updated: 'Password updated.', sent: 'If the email exists, you will receive a reset email.', busy: 'Working...', update: 'Set new password', send: 'Send reset email' },
  es: { email: 'Correo', newPassword: 'Nueva contraseña', missing: 'La cuenta en la nube no está configurada; no se puede enviar el correo.', missingShort: 'La cuenta en la nube no está configurada.', updated: 'Contraseña actualizada.', sent: 'Si el correo existe, recibirás un mensaje de restablecimiento.', busy: 'Procesando...', update: 'Crear nueva contraseña', send: 'Enviar correo' },
} satisfies Record<Locale, Record<string, string>>;

export default function PasswordResetForm({ locale, mode = 'request' }: Props) {
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
    const result = mode === 'update' ? await updatePassword(password) : await requestPasswordReset(email);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      setAuthMessage(result.error);
      return;
    }
    setMessage(mode === 'update' ? text.updated : text.sent);
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      {mode === 'request' ? (
        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="reset-email">{text.email}</label>
          <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" required />
        </div>
      ) : (
        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="new-password">{text.newPassword}</label>
          <input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" required minLength={8} />
        </div>
      )}
      {!isConfigured && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-100">{text.missingShort}</p>}
      {message && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{message}</p>}
      <button type="submit" disabled={busy} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
        {busy ? text.busy : mode === 'update' ? text.update : text.send}
      </button>
    </form>
  );
}

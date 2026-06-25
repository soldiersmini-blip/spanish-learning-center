import { Download, ShieldAlert } from 'lucide-react';
import PageHeader from '../../components/navigation/PageHeader';
import LoginForm from '../../components/account/LoginForm';
import RegisterForm from '../../components/account/RegisterForm';
import PasswordResetForm from '../../components/account/PasswordResetForm';
import SyncStatus from '../../components/account/SyncStatus';
import { useAuth } from '../../auth/useAuth';
import type { RouteId } from '../../navigation/routes';
import { localDataRegistry } from '../../sync/localDataRegistry';
import type { Locale } from '../../types';

type AccountPageMode = 'profile' | 'login' | 'register' | 'verify-email' | 'password-recovery' | 'sync' | 'delete';

interface Props {
  mode: AccountPageMode;
  locale: Locale;
  onBack: () => void;
  onNavigateRoute: (routeId: RouteId) => void;
}

const routeByMode: Record<AccountPageMode, RouteId> = {
  profile: 'account',
  login: 'account-login',
  register: 'account-register',
  'verify-email': 'account-verify-email',
  'password-recovery': 'account-password-recovery',
  sync: 'account-sync',
  delete: 'account-delete',
};

const copy = {
  zh: {
    titles: { profile: '个人中心', login: '登录', register: '注册', 'verify-email': '邮箱验证', 'password-recovery': '忘记或重设密码', sync: '同步和数据管理', delete: '注销账号确认' },
    subtitleConfigured: '账号和云同步框架',
    subtitleMissing: '云账号功能尚未配置，游客模式仍可使用。',
    missingTitle: '云账号功能尚未配置',
    missingBody: '请先配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。当前所有学习功能继续使用本地游客数据。',
    guest: '游客',
    guestBody: '未登录。数据仅保存在当前浏览器。',
    signedIn: 'Signed in',
    guestMode: 'Guest mode',
    login: '登录',
    register: '注册',
    syncManage: '同步管理',
    verifyTitle: '请检查邮箱',
    verifyBody: '如果 Supabase 邮箱验证已启用，注册后需要点击邮件中的验证链接。GitHub Pages 回调地址应配置为 `?auth=callback`。',
    syncTitle: '同步和数据管理',
    export: '导出备份',
    cloudConfig: '云配置',
    configured: '已配置',
    missing: '未配置',
    syncState: '同步状态',
    guestData: '游客数据',
    localKeep: '本地保留',
    category: '数据类别',
    key: '键名',
    cloudSync: '云同步',
    yes: '是',
    no: '否',
    danger: '注销账号需要 Edge Function',
    dangerBody: '浏览器端不会保存管理员密钥，也不会直接删除认证用户。正式注销流程需要部署 Supabase Edge Function，并要求再次确认与导出数据。',
  },
  en: {
    titles: { profile: 'Account', login: 'Log in', register: 'Sign up', 'verify-email': 'Verify email', 'password-recovery': 'Password recovery', sync: 'Sync and data', delete: 'Delete account' },
    subtitleConfigured: 'Account and cloud sync framework',
    subtitleMissing: 'Cloud account is not configured. Guest mode remains available.',
    missingTitle: 'Cloud account is not configured',
    missingBody: 'Please configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` first. Learning features continue to use local guest data.',
    guest: 'Guest',
    guestBody: 'Not signed in. Data is saved only in this browser.',
    signedIn: 'Signed in',
    guestMode: 'Guest mode',
    login: 'Log in',
    register: 'Sign up',
    syncManage: 'Sync',
    verifyTitle: 'Check your email',
    verifyBody: 'If Supabase email verification is enabled, click the verification link after registration. The GitHub Pages callback should use `?auth=callback`.',
    syncTitle: 'Sync and data management',
    export: 'Export backup',
    cloudConfig: 'Cloud config',
    configured: 'Configured',
    missing: 'Missing',
    syncState: 'Sync state',
    guestData: 'Guest data',
    localKeep: 'Kept locally',
    category: 'Category',
    key: 'Key',
    cloudSync: 'Cloud sync',
    yes: 'Yes',
    no: 'No',
    danger: 'Account deletion requires an Edge Function',
    dangerBody: 'The browser never stores admin keys and cannot directly delete auth users. Production deletion requires a Supabase Edge Function, renewed confirmation, and export guidance.',
  },
  es: {
    titles: { profile: 'Cuenta', login: 'Entrar', register: 'Registro', 'verify-email': 'Verificar correo', 'password-recovery': 'Recuperar contraseña', sync: 'Sincronización y datos', delete: 'Eliminar cuenta' },
    subtitleConfigured: 'Marco de cuenta y sincronización',
    subtitleMissing: 'La cuenta en la nube no está configurada. El modo invitado sigue disponible.',
    missingTitle: 'La cuenta en la nube no está configurada',
    missingBody: 'Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Las funciones de aprendizaje siguen usando datos locales.',
    guest: 'Invitado',
    guestBody: 'No has iniciado sesión. Los datos solo se guardan en este navegador.',
    signedIn: 'Sesión iniciada',
    guestMode: 'Modo invitado',
    login: 'Entrar',
    register: 'Registro',
    syncManage: 'Sincronizar',
    verifyTitle: 'Revisa tu correo',
    verifyBody: 'Si la verificación por correo está activada en Supabase, usa el enlace recibido. El callback de GitHub Pages debe usar `?auth=callback`.',
    syncTitle: 'Sincronización y datos',
    export: 'Exportar copia',
    cloudConfig: 'Configuración',
    configured: 'Configurada',
    missing: 'Falta',
    syncState: 'Estado',
    guestData: 'Datos invitados',
    localKeep: 'Guardado local',
    category: 'Categoría',
    key: 'Clave',
    cloudSync: 'Nube',
    yes: 'Sí',
    no: 'No',
    danger: 'Eliminar cuenta requiere una Edge Function',
    dangerBody: 'El navegador no guarda claves de administrador ni elimina usuarios directamente. La eliminación real requiere una Edge Function, confirmación renovada y opción de exportación.',
  },
};

export default function AccountPage({ mode, locale, onBack, onNavigateRoute }: Props) {
  const { user, isAuthenticated, isConfigured, configStatus, authMessage, syncState } = useAuth();
  const text = copy[locale];
  const routeId = routeByMode[mode];
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || text.guest;

  return (
    <>
      <PageHeader
        routeId={routeId}
        title={text.titles[mode]}
        eyebrow="Account"
        subtitle={isConfigured ? text.subtitleConfigured : text.subtitleMissing}
        onBack={onBack}
        onNavigateRoute={onNavigateRoute}
      />
      <main className="mx-auto w-full max-w-5xl px-5 py-8">
        {!isConfigured && (
          <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-black">{text.missingTitle}</p>
                <p className="mt-1 text-sm leading-6">{text.missingBody}</p>
              </div>
            </div>
          </section>
        )}
        {authMessage && <p className="mb-5 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{authMessage}</p>}
        {mode === 'login' && <LoginForm locale={locale} onForgotPassword={() => onNavigateRoute('account-password-recovery')} />}
        {mode === 'register' && <RegisterForm locale={locale} />}
        {mode === 'password-recovery' && <PasswordResetForm locale={locale} />}
        {mode === 'verify-email' && <VerifyEmail text={text} />}
        {mode === 'sync' && <SyncManagement text={text} configStatus={configStatus} syncState={syncState} />}
        {mode === 'delete' && <DeleteAccountNotice text={text} />}
        {mode === 'profile' && (
          <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="card p-6">
              <p className="text-xs font-black uppercase tracking-widest text-coral-600 dark:text-coral-100">{isAuthenticated ? text.signedIn : text.guestMode}</p>
              <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{displayName}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{user?.email || text.guestBody}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <SyncStatus state={syncState} locale={locale} />
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">{configStatus}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => onNavigateRoute('account-login')} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">{text.login}</button>
                <button type="button" onClick={() => onNavigateRoute('account-register')} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{text.register}</button>
                <button type="button" onClick={() => onNavigateRoute('account-sync')} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{text.syncManage}</button>
              </div>
            </div>
            <SyncManagement text={text} configStatus={configStatus} syncState={syncState} compact />
          </section>
        )}
      </main>
    </>
  );
}

type AccountCopy = typeof copy.zh;

function VerifyEmail({ text }: { text: AccountCopy }) {
  return (
    <section className="card p-6">
      <h2 className="text-2xl font-black text-slate-950 dark:text-white">{text.verifyTitle}</h2>
      <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{text.verifyBody}</p>
    </section>
  );
}

function SyncManagement({ text, configStatus, syncState, compact = false }: { text: AccountCopy; configStatus: string; syncState: string; compact?: boolean }) {
  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-coral-600 dark:text-coral-100">Sync</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{text.syncTitle}</h2>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <Download className="h-4 w-4" />
          {text.export}
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label={text.cloudConfig} value={configStatus === 'configured' ? text.configured : text.missing} />
        <Metric label={text.syncState} value={String(syncState)} />
        <Metric label={text.guestData} value={text.localKeep} />
      </div>
      {!compact && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr><th className="px-3 py-2">{text.category}</th><th className="px-3 py-2">{text.key}</th><th className="px-3 py-2">{text.cloudSync}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {localDataRegistry.map((item) => (
                <tr key={`${item.category}-${item.keyPattern}`}>
                  <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">{item.category}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">{item.keyPattern}</td>
                  <td className="px-3 py-2">{item.cloudSync ? text.yes : text.no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function DeleteAccountNotice({ text }: { text: AccountCopy }) {
  return (
    <section className="card p-6">
      <p className="text-xs font-black uppercase tracking-widest text-coral-600 dark:text-coral-100">Danger zone</p>
      <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{text.danger}</h2>
      <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{text.dangerBody}</p>
    </section>
  );
}

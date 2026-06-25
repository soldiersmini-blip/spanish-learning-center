import type { SyncState } from '../../auth/AuthProvider';
import type { Locale } from '../../types';

const labels: Record<Locale, Record<SyncState, string>> = {
  zh: {
    'local-only': '仅本地',
    syncing: '正在同步',
    synced: '已同步',
    'pending-upload': '待同步',
    offline: '离线',
    failed: '同步失败',
    conflict: '有冲突',
  },
  en: {
    'local-only': 'Local only',
    syncing: 'Syncing',
    synced: 'Synced',
    'pending-upload': 'Pending',
    offline: 'Offline',
    failed: 'Failed',
    conflict: 'Conflict',
  },
  es: {
    'local-only': 'Solo local',
    syncing: 'Sincronizando',
    synced: 'Sincronizado',
    'pending-upload': 'Pendiente',
    offline: 'Sin conexión',
    failed: 'Error',
    conflict: 'Conflicto',
  },
};

export default function SyncStatus({ state, locale = 'zh' }: { state: SyncState; locale?: Locale }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">
      {labels[locale][state]}
    </span>
  );
}

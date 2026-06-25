import { Download, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import PageHeader from '../components/navigation/PageHeader';
import type { RouteId } from '../navigation/routes';

interface Props {
  onBackHome: () => void;
  onNavigateRoute: (routeId: RouteId) => void;
}

type ExportPayload = {
  app: 'spanish-learning-center';
  exportedAt: string;
  origin: string;
  version: string;
  build: string;
  localStorage: Record<string, string>;
};

function getLocalStorageSnapshot() {
  const snapshot: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    const value = localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
}

function normalizeImportPayload(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as { localStorage?: unknown };
  const storage = candidate.localStorage && typeof candidate.localStorage === 'object'
    ? candidate.localStorage as Record<string, unknown>
    : value as Record<string, unknown>;

  const normalized: Record<string, string> = {};
  Object.entries(storage).forEach(([key, item]) => {
    if (typeof key === 'string' && typeof item === 'string') normalized[key] = item;
  });
  return normalized;
}

export default function SettingsPage({ onBackHome, onNavigateRoute }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState('');
  const [lastImportCount, setLastImportCount] = useState(0);
  const localData = useMemo(getLocalStorageSnapshot, [lastImportCount]);
  const localKeys = Object.keys(localData).sort();

  function exportData() {
    const payload: ExportPayload = {
      app: 'spanish-learning-center',
      exportedAt: new Date().toISOString(),
      origin: window.location.origin,
      version: __APP_VERSION__,
      build: __BUILD_COMMIT__,
      localStorage: getLocalStorageSnapshot(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `spanish-learning-center-local-data-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('已导出当前浏览器里的学习记录。');
  }

  async function importData(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const imported = normalizeImportPayload(parsed);
      const entries = Object.entries(imported);
      entries.forEach(([key, value]) => localStorage.setItem(key, value));
      setLastImportCount((count) => count + entries.length);
      setMessage(`已导入 ${entries.length} 条本地学习数据。刷新页面后也会继续保留。`);
    } catch {
      setMessage('导入失败：请选择有效的 JSON 备份文件。');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <PageHeader
        routeId="settings"
        title="学习数据导入 / 导出"
        eyebrow="Settings"
        subtitle="导出或导入当前浏览器里的学习记录。"
        onBack={onBackHome}
        onNavigateRoute={onNavigateRoute}
      />
      <main className="mx-auto w-full max-w-5xl px-5 py-8">
        <section className="card p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-coral-600 dark:text-coral-100">Data migration</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">学习数据导入 / 导出</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            学习记录保存在浏览器本地。正式站点、localhost、不同电脑和不同浏览器的数据不会自动互通；需要先导出 JSON，再在目标页面导入。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={exportData}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700"
            >
              <Download className="h-5 w-5" />
              导出学习数据
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Upload className="h-5 w-5" />
              导入学习数据
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importData(file);
            }}
          />

          {message && (
            <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
              {message}
            </p>
          )}

          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-slate-950 dark:text-white">当前本地数据</h2>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">{localKeys.length} 项</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {localKeys.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-300">当前浏览器还没有学习记录。</p>}
              {localKeys.map((key) => (
                <div key={key} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-200">{key}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

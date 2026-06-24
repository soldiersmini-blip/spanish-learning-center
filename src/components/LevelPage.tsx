import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { LevelContent, Locale } from '../types';
import { t, uiText } from '../i18n';
import ProgressBar from './ProgressBar';
import ModulePanel from './ModulePanel';

interface Props {
  content: LevelContent;
  locale: Locale;
  onHome: () => void;
}

export default function LevelPage({ content, locale, onHome }: Props) {
  const storageKey = `spanish-progress-${content.id}`;
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) as string[] : [];
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(completedIds));
  }, [completedIds, storageKey]);

  const completedCount = useMemo(() => completedIds.filter((id) => content.modules.some((module) => module.id === id)).length, [completedIds, content.modules]);

  function toggleModule(id: string) {
    setCompletedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8">
      <button type="button" onClick={onHome} className="mb-5 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
        <ArrowLeft className="h-4 w-4" />
        {t(uiText.backHome, locale)}
      </button>
      <div className="mb-6 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-coral-600 dark:text-coral-100">{content.id.toUpperCase()}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">{t(content.title, locale)}</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">{t(content.subtitle, locale)}</p>
        </div>
        <ProgressBar completed={completedCount} total={content.modules.length} locale={locale} />
      </div>
      <div className="space-y-5">
        {content.modules.map((module) => (
          <ModulePanel
            key={module.id}
            module={module}
            locale={locale}
            completed={completedIds.includes(module.id)}
            onToggleComplete={() => toggleModule(module.id)}
          />
        ))}
      </div>
    </main>
  );
}

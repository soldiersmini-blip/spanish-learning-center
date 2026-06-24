import { ArrowLeft } from 'lucide-react';
import type { LevelId, Locale } from '../types';
import { t, uiText } from '../i18n';

interface Props {
  level: Extract<LevelId, 'b1' | 'b2'>;
  locale: Locale;
  onHome: () => void;
}

export default function ComingSoon({ level, locale, onHome }: Props) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-104px)] w-full max-w-3xl flex-col justify-center px-5 py-10">
      <button type="button" onClick={onHome} className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
        <ArrowLeft className="h-4 w-4" />
        {t(uiText.backHome, locale)}
      </button>
      <section className="card p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-coral-600 dark:text-coral-100">{level.toUpperCase()}</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">{t(uiText.reservedTitle, locale)}</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">{t(uiText.comingSoon, locale)}</p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{t(uiText.reservedBody, locale)}</p>
      </section>
    </main>
  );
}

import { Volume2 } from 'lucide-react';
import type { Locale, SentencePattern } from '../types';
import { t, uiText } from '../i18n';

interface Props {
  pattern: SentencePattern;
  locale: Locale;
}

export default function SentenceCard({ pattern, locale }: Props) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <span className="chip">{t(pattern.theme, locale)}</span>
        <button className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" title={t(uiText.audio, locale)} type="button">
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
      <h4 className="mt-3 text-lg font-semibold text-brand-700 dark:text-brand-100">{pattern.spanish}</h4>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{pattern.zh}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{pattern.en}</p>
      <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-200">{pattern.slot}</p>
    </article>
  );
}

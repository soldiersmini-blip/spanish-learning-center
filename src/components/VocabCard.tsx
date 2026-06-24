import { Volume2 } from 'lucide-react';
import type { Locale, VocabItem } from '../types';
import { t, uiText } from '../i18n';

interface Props {
  item: VocabItem;
  locale: Locale;
}

export default function VocabCard({ item, locale }: Props) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-brand-700 dark:text-brand-100">{item.spanish}</h4>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{item.zh} · {item.en}</p>
        </div>
        <button className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" title={t(uiText.audio, locale)} type="button">
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{item.example}</p>
    </article>
  );
}

import type { GrammarPoint, Locale } from '../types';
import { t } from '../i18n';

interface Props {
  point: GrammarPoint;
  locale: Locale;
}

export default function GrammarCard({ point, locale }: Props) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{t(point.title, locale)}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{t(point.explanation, locale)}</p>
      <div className="mt-3 space-y-2">
        {point.examples.map((example) => (
          <p key={example} className="rounded-md bg-white px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {example}
          </p>
        ))}
      </div>
    </article>
  );
}

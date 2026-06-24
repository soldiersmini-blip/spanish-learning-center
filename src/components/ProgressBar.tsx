import { CheckCircle2 } from 'lucide-react';
import type { Locale } from '../types';
import { t, uiText } from '../i18n';

interface Props {
  completed: number;
  total: number;
  locale: Locale;
}

export default function ProgressBar({ completed, total, locale }: Props) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-5 w-5 text-mint-500" />
          {t(uiText.progress, locale)}
        </div>
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {completed}/{total} · {percent}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-mint-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}

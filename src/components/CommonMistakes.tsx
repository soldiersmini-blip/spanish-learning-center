import { AlertTriangle } from 'lucide-react';
import type { CommonMistake } from '../types/grammar';

interface Props {
  mistakes: CommonMistake[];
}

export default function CommonMistakes({ mistakes }: Props) {
  return (
    <section className="rounded-lg border border-coral-100 bg-coral-100/40 p-4 dark:border-coral-600 dark:bg-slate-950">
      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
        <AlertTriangle className="h-5 w-5 text-coral-600" />
        常见错误
      </h3>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {mistakes.map((mistake) => (
          <article key={`${mistake.wrong}-${mistake.correct}`} className="rounded-lg bg-white p-3 dark:bg-slate-900">
            <p className="text-sm text-coral-600 line-through">{mistake.wrong}</p>
            <p className="mt-1 text-sm font-semibold text-mint-500">{mistake.correct}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{mistake.reasonZh}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

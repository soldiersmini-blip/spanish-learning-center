import type { Locale } from '../../types';
import type { LearningMapStats } from '../../types/learningMap';

const labels = {
  mastered: { zh: '已掌握', en: 'Mastered', es: 'Dominado' },
  inProgress: { zh: '学习中', en: 'In progress', es: 'En curso' },
  notStarted: { zh: '未学习', en: 'Not started', es: 'Sin empezar' },
  hidden: { zh: '隐藏', en: 'Hidden', es: 'Oculto' },
};

interface Props {
  stats: LearningMapStats;
  locale: Locale;
}

export default function LearningProgressBadge({ stats, locale }: Props) {
  return (
    <div className="grid gap-2 text-xs sm:grid-cols-4">
      <span className="rounded-lg bg-mint-50 px-3 py-2 font-semibold text-mint-700 dark:bg-mint-500/15 dark:text-mint-100">
        {labels.mastered[locale]} {stats.mastered}/{stats.total}
      </span>
      <span className="rounded-lg bg-brand-50 px-3 py-2 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
        {labels.inProgress[locale]} {stats.inProgress}
      </span>
      <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {labels.notStarted[locale]} {stats.notStarted}
      </span>
      <span className="rounded-lg bg-coral-50 px-3 py-2 font-semibold text-coral-700 dark:bg-coral-500/15 dark:text-coral-100">
        {labels.hidden[locale]} {stats.hidden}
      </span>
    </div>
  );
}

import type { Locale } from '../../types';
import type { LearningNodeStatus } from '../../types/learningMap';

const statusLabels: Record<LearningNodeStatus, Record<Locale, string>> = {
  not_started: { zh: '未学习', en: 'Not started', es: 'Sin empezar' },
  in_progress: { zh: '学习中', en: 'In progress', es: 'En curso' },
  mastered: { zh: '已掌握', en: 'Mastered', es: 'Dominado' },
};

const statusClasses: Record<LearningNodeStatus, string> = {
  not_started: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
  in_progress: 'border-brand-500 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-100 dark:bg-brand-500/15 dark:text-brand-100',
  mastered: 'border-mint-500 bg-mint-50 text-mint-700 hover:bg-mint-100 dark:border-mint-100 dark:bg-mint-500/15 dark:text-mint-100',
};

interface Props {
  status: LearningNodeStatus;
  locale: Locale;
  onCycle: () => void;
}

export default function LearningNodeStatusButton({ status, locale, onCycle }: Props) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onCycle();
      }}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${statusClasses[status]}`}
      aria-label={`${statusLabels[status][locale]}，点击切换状态`}
    >
      {statusLabels[status][locale]}
    </button>
  );
}

import type { Locale } from '../../types';
import type { LearningMapFilterMode, LearningMapViewMode } from '../../types/learningMap';

const labels = {
  expandAll: { zh: '展开全部', en: 'Expand all', es: 'Expandir todo' },
  collapseAll: { zh: '收起全部', en: 'Collapse all', es: 'Contraer todo' },
  hideMastered: { zh: '隐藏已掌握', en: 'Hide mastered', es: 'Ocultar dominado' },
  showHidden: { zh: '显示隐藏', en: 'Show hidden', es: 'Mostrar ocultos' },
  all: { zh: '显示全部', en: 'All', es: 'Todo' },
  notStarted: { zh: '仅未学习', en: 'Not started', es: 'Sin empezar' },
  inProgress: { zh: '仅学习中', en: 'In progress', es: 'En curso' },
  mastered: { zh: '仅已掌握', en: 'Mastered', es: 'Dominado' },
  standard: { zh: '标准', en: 'Standard', es: 'Estándar' },
  compact: { zh: '紧凑', en: 'Compact', es: 'Compacto' },
  focus: { zh: '专注', en: 'Focus', es: 'Enfoque' },
  reset: { zh: '重置视图', en: 'Reset view', es: 'Restablecer vista' },
};

interface Props {
  locale: Locale;
  hideMastered: boolean;
  showHidden: boolean;
  viewMode: LearningMapViewMode;
  filterMode: LearningMapFilterMode;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onHideMastered: (value: boolean) => void;
  onShowHidden: (value: boolean) => void;
  onViewMode: (mode: LearningMapViewMode) => void;
  onFilterMode: (mode: LearningMapFilterMode) => void;
  onResetView: () => void;
}

const buttonBase = 'rounded-lg border px-3 py-2 text-xs font-semibold transition';
const activeClass = 'border-brand-600 bg-brand-600 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-slate-950';
const inactiveClass = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

export default function LearningMapToolbar({
  locale,
  hideMastered,
  showHidden,
  viewMode,
  filterMode,
  onExpandAll,
  onCollapseAll,
  onHideMastered,
  onShowHidden,
  onViewMode,
  onFilterMode,
  onResetView,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${buttonBase} ${inactiveClass}`} onClick={onExpandAll}>{labels.expandAll[locale]}</button>
        <button type="button" className={`${buttonBase} ${inactiveClass}`} onClick={onCollapseAll}>{labels.collapseAll[locale]}</button>
        <button
          type="button"
          className={`${buttonBase} ${hideMastered ? activeClass : inactiveClass}`}
          onClick={() => onHideMastered(!hideMastered)}
        >
          {labels.hideMastered[locale]}
        </button>
        <button
          type="button"
          className={`${buttonBase} ${showHidden ? activeClass : inactiveClass}`}
          onClick={() => onShowHidden(!showHidden)}
        >
          {labels.showHidden[locale]}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['all', 'not_started', 'in_progress', 'mastered'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`${buttonBase} ${filterMode === mode ? activeClass : inactiveClass}`}
            onClick={() => onFilterMode(mode)}
          >
            {mode === 'all' ? labels.all[locale] : mode === 'not_started' ? labels.notStarted[locale] : mode === 'in_progress' ? labels.inProgress[locale] : labels.mastered[locale]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(['standard', 'compact', 'focus'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`${buttonBase} ${viewMode === mode ? activeClass : inactiveClass}`}
            onClick={() => onViewMode(mode)}
          >
            {labels[mode][locale]}
          </button>
        ))}
        <button type="button" className={`${buttonBase} ${inactiveClass}`} onClick={onResetView}>{labels.reset[locale]}</button>
      </div>
    </div>
  );
}

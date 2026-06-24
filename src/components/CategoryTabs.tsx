interface CategoryTab {
  id: string;
  label: string;
  count: number;
}

interface Props {
  tabs: CategoryTab[];
  activeId: string;
  onChange: (id: string) => void;
  allLabel: string;
  includeAll?: boolean;
}

export default function CategoryTabs({ tabs, activeId, onChange, allLabel, includeAll = true }: Props) {
  const allCount = tabs.reduce((sum, tab) => sum + tab.count, 0);
  const visibleTabs = includeAll ? [{ id: 'all', label: allLabel, count: allCount }, ...tabs] : tabs;

  return (
    <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" aria-label="Category tabs">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-lg border px-4 py-3 text-left transition ${
            activeId === tab.id
              ? 'border-brand-600 bg-brand-600 text-white shadow-soft'
              : 'border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <span className="block text-sm font-bold">{tab.label}</span>
          <span className={`mt-1 block text-xs ${activeId === tab.id ? 'text-brand-50' : 'text-slate-500 dark:text-slate-400'}`}>
            {tab.count}
          </span>
        </button>
      ))}
    </nav>
  );
}

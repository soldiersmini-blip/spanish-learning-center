import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface Props<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  emptyText: string;
  batchSize?: number;
}

export default function LoadMoreGrid<T>({ items, renderItem, getKey, emptyText, batchSize = 12 }: Props<T>) {
  const [visibleCount, setVisibleCount] = useState(batchSize);

  useEffect(() => {
    setVisibleCount(batchSize);
  }, [items, batchSize]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => (
          <div key={getKey(item)}>{renderItem(item)}</div>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + batchSize)}
            className="rounded-md border border-brand-600 bg-white px-5 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:bg-slate-900 dark:text-brand-100 dark:hover:bg-slate-800"
          >
            显示更多 · {Math.min(batchSize, items.length - visibleCount)}
          </button>
        </div>
      )}
    </div>
  );
}

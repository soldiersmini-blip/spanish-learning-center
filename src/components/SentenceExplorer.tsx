import { useMemo, useState } from 'react';
import type { Locale, SentencePattern } from '../types';
import { t, uiText } from '../i18n';
import CategoryTabs from './CategoryTabs';
import LoadMoreGrid from './LoadMoreGrid';
import SentenceCard from './SentenceCard';

interface Props {
  patterns: SentencePattern[];
  locale: Locale;
}

export default function SentenceExplorer({ patterns, locale }: Props) {
  const scenes = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    patterns.forEach((pattern) => {
      const id = pattern.scene || pattern.theme.zh;
      const label = t(pattern.theme, locale);
      map.set(id, { label, count: (map.get(id)?.count || 0) + 1 });
    });
    return Array.from(map.entries()).map(([id, value]) => ({ id, label: value.label, count: value.count }));
  }, [patterns, locale]);

  const [activeScene, setActiveScene] = useState(scenes[0]?.id || 'all');
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const grouped = useMemo(() => {
    const result = new Map<string, { label: string; items: SentencePattern[] }>();
    patterns
      .map((pattern, index) => ({
        ...pattern,
        id: pattern.id || `${pattern.theme.zh}-${pattern.spanish}-${index}`,
        scene: pattern.scene || pattern.theme.zh,
        slots: pattern.slots || [pattern.slot],
      }))
      .filter((pattern) => activeScene === 'all' || pattern.scene === activeScene)
      .filter((pattern) => {
        if (!normalizedQuery) return true;
        return [pattern.spanish, pattern.zh, pattern.en, pattern.slot, pattern.scene || '', t(pattern.theme, locale)].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      })
      .forEach((pattern) => {
        const id = pattern.scene || pattern.theme.zh;
        const label = t(pattern.theme, locale);
        const current = result.get(id) || { label, items: [] };
        current.items.push(pattern);
        result.set(id, current);
      });
    return Array.from(result.entries()).map(([id, value]) => ({ id, ...value }));
  }, [activeScene, locale, normalizedQuery, patterns]);

  const activeLabel = activeScene === 'all'
    ? t(uiText.allThemes, locale)
    : scenes.find((scene) => scene.id === activeScene)?.label || '';

  return (
    <div className="space-y-5">
      <CategoryTabs tabs={scenes} activeId={activeScene} onChange={setActiveScene} allLabel={t(uiText.allThemes, locale)} />

      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">当前场景</p>
            <h3 className="text-xl font-bold text-slate-950 dark:text-white">{activeLabel}</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">每次最多显示 12 张卡片</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索句式、翻译、场景或替换词槽"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </div>

      {grouped.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          没有找到匹配的句式。可以换一个关键词，或切换到“全部”场景再搜索。
        </div>
      )}

      {grouped.map((group) => (
        <section key={group.id} className="space-y-3">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            {group.label} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{group.items.length}</span>
          </h3>
          <LoadMoreGrid<SentencePattern>
            items={group.items}
            getKey={(item) => item.id || `${group.id}-${item.spanish}`}
            renderItem={(item) => <SentenceCard pattern={item} locale={locale} />}
            emptyText="这个场景下暂时没有句式。"
          />
        </section>
      ))}
    </div>
  );
}

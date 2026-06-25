import { useMemo, useState } from 'react';
import type { Locale, VocabCategory, VocabItem } from '../types';
import { t, uiText } from '../i18n';
import CategoryTabs from './CategoryTabs';
import LoadMoreGrid from './LoadMoreGrid';
import VocabCard from './VocabCard';

interface Props {
  categories: VocabCategory[];
  locale: Locale;
}

const normalize = (value: string) => value.trim().toLowerCase();

export default function VocabularyExplorer({ categories, locale }: Props) {
  const firstId = categories[0]?.title.zh || 'all';
  const [activeCategory, setActiveCategory] = useState(firstId);
  const [query, setQuery] = useState('');
  const normalizedQuery = normalize(query);

  const tabs = categories.map((category) => ({
    id: category.title.zh,
    label: t(category.title, locale),
    count: category.items.length,
  }));
  const totalCount = tabs.reduce((sum, tab) => sum + tab.count, 0);
  const levelLabel = categories[0]?.items[0]?.level || '';

  const visibleGroups = useMemo(() => {
    return categories
      .filter((category) => activeCategory === 'all' || category.title.zh === activeCategory)
      .map((category) => ({
        category,
        items: category.items
          .map((item, index) => ({
            ...item,
            id: item.id || `${category.title.zh}-${item.spanish}-${index}`,
            category: item.category || category.title.zh,
          }))
          .filter((item) => {
            if (!normalizedQuery) return true;
            return [item.spanish, item.zh, item.en, item.example, item.category || ''].some((value) =>
              value.toLowerCase().includes(normalizedQuery),
            );
          }),
      }))
      .filter((group) => group.items.length > 0);
  }, [activeCategory, categories, normalizedQuery]);

  const activeLabel = activeCategory === 'all'
    ? t(uiText.allThemes, locale)
    : tabs.find((tab) => tab.id === activeCategory)?.label || '';

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">词汇总量</p>
        <h3 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
          {levelLabel} {totalCount} 个核心词汇
        </h3>
      </div>
      <CategoryTabs tabs={tabs} activeId={activeCategory} onChange={setActiveCategory} allLabel={t(uiText.allThemes, locale)} />

      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">当前分类</p>
            <h3 className="text-xl font-bold text-slate-950 dark:text-white">{activeLabel}</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">每次最多显示 12 张卡片</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(uiText.searchVocab, locale)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </div>

      {visibleGroups.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          没有找到匹配的词汇。可以换一个关键词，或切换到“全部”分类再搜索。
        </div>
      )}

      {visibleGroups.map((group) => (
        <section key={group.category.title.zh} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              {t(group.category.title, locale)} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{group.items.length}</span>
            </h3>
          </div>
          <LoadMoreGrid<VocabItem>
            items={group.items}
            getKey={(item) => item.id || `${group.category.title.zh}-${item.spanish}`}
            renderItem={(item) => <VocabCard item={item} locale={locale} />}
            emptyText="这个分类下暂时没有词汇。"
          />
        </section>
      ))}
    </div>
  );
}

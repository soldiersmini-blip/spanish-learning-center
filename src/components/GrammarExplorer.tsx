import { useMemo, useState } from 'react';
import type { GrammarTopic } from '../types/grammar';
import GrammarTopicDetail from './GrammarTopicDetail';
import BrandLogo from './BrandLogo';

interface Props {
  topics: GrammarTopic[];
}

export default function GrammarExplorer({ topics }: Props) {
  const [activeId, setActiveId] = useState(topics[0]?.id || '');
  const activeTopic = topics.find((topic) => topic.id === activeId) || topics[0];

  const categories = useMemo(() => {
    const grouped = new Map<string, GrammarTopic[]>();
    topics.forEach((topic) => {
      grouped.set(topic.category, [...(grouped.get(topic.category) || []), topic]);
    });
    return Array.from(grouped.entries());
  }, [topics]);

  if (!activeTopic) {
    return null;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="flex gap-3 overflow-x-auto pb-2 lg:block lg:space-y-4 lg:overflow-visible lg:pb-0">
          <section className="hidden rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 lg:block">
            <BrandLogo size="small" showText subtitle="Spanish Learning Center" />
          </section>
          {categories.map(([category, items]) => (
            <section key={category} className="min-w-64 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 lg:min-w-0">
              <h3 className="px-2 pb-2 text-sm font-bold text-slate-500 dark:text-slate-400">{category}</h3>
              <div className="grid gap-2">
                {items.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setActiveId(topic.id)}
                    className={`rounded-md px-3 py-3 text-left transition ${
                      activeTopic.id === topic.id
                        ? 'bg-brand-600 text-white shadow-soft'
                        : 'bg-slate-50 text-slate-700 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-semibold">{topic.title}</span>
                    <span className={`mt-1 block text-xs leading-5 ${activeTopic.id === topic.id ? 'text-brand-50' : 'text-slate-500 dark:text-slate-400'}`}>
                      {topic.shortDescription}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>
      <GrammarTopicDetail topic={activeTopic} />
    </div>
  );
}

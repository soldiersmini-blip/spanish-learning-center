import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LevelContent, LevelId, Locale } from '../types';
import { t, uiText } from '../i18n';
import ModulePanel from './ModulePanel';
import BrandLogo from './BrandLogo';
import VocabMasteryTest from './VocabMasteryTest';
import NeuralLearningStats from './neural/NeuralLearningStats';
import { a1VocabularyItems } from '../data/vocabulary/a1';
import { a2VocabularyItems } from '../data/vocabulary/a2';

interface Props {
  content: LevelContent;
  locale: Locale;
  onHome: () => void;
  onNavigate: (target: LevelId) => void;
  onStartVocabTest: (level: 'a1' | 'a2', count: number) => void;
}

export default function LevelPage({ content, locale, onHome, onNavigate, onStartVocabTest }: Props) {
  const storageKey = `spanish-progress-${content.id}`;
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) as string[] : [];
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(completedIds));
  }, [completedIds, storageKey]);

  function toggleModule(id: string) {
    setCompletedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const vocabLevel = content.id === 'a1' ? 'A1' : 'A2';
  const vocabWords = content.id === 'a1' ? a1VocabularyItems : a2VocabularyItems;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8">
      <button type="button" onClick={onHome} className="mb-5 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
        <ArrowLeft className="h-4 w-4" />
        {t(uiText.backHome, locale)}
      </button>
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <BrandLogo size="medium" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-coral-600 dark:text-coral-100">{content.id.toUpperCase()}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">{t(content.title, locale)}</h1>
            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">{t(content.subtitle, locale)}</p>
          </div>
        </div>
      </div>
      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <VocabMasteryTest
          level={vocabLevel}
          words={vocabWords}
          onNavigate={onNavigate}
          onStartTest={(count) => onStartVocabTest(content.id, count)}
        />
        <NeuralLearningStats level={vocabLevel} />
      </div>
      <div className="space-y-5">
        {content.modules.map((module) => (
          <ModulePanel
            key={module.id}
            module={module}
            locale={locale}
            completed={completedIds.includes(module.id)}
            onToggleComplete={() => toggleModule(module.id)}
          />
        ))}
      </div>
    </main>
  );
}

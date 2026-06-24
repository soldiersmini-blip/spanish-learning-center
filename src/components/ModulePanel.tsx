import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { CourseModule, Locale } from '../types';
import { t, uiText } from '../i18n';
import GrammarCard from './GrammarCard';
import SkillSection from './SkillSection';
import GrammarExplorer from './GrammarExplorer';
import VocabularyExplorer from './VocabularyExplorer';
import SentenceExplorer from './SentenceExplorer';

interface Props {
  module: CourseModule;
  locale: Locale;
  completed: boolean;
  onToggleComplete: () => void;
}

export default function ModulePanel({ module, locale, completed, onToggleComplete }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-w-0 items-center gap-3 text-left">
          <ChevronDown className={`h-5 w-5 shrink-0 transition ${open ? '' : '-rotate-90'}`} />
          <span>
            <span className="block text-xl font-bold text-slate-950 dark:text-white">{t(module.title, locale)}</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{t(module.description, locale)}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleComplete}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            completed ? 'bg-mint-500 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          {completed ? t(uiText.completed, locale) : t(uiText.completeModule, locale)}
        </button>
      </div>
      {open && (
        <div className="space-y-6 p-4 sm:p-5">
          {module.type === 'vocabulary' && (
            <VocabularyExplorer categories={module.vocabCategories || []} locale={locale} />
          )}

          {module.type === 'grammar' && module.grammarTopics && (
            <GrammarExplorer topics={module.grammarTopics} />
          )}

          {(module.type === 'pronunciation' || (module.type === 'grammar' && !module.grammarTopics)) && (
            <div className="grid gap-3 md:grid-cols-2">
              {(module.grammarPoints || []).map((point) => <GrammarCard key={point.title.zh} point={point} locale={locale} />)}
            </div>
          )}

          {module.type === 'sentences' && (
            <SentenceExplorer patterns={module.sentencePatterns || []} locale={locale} />
          )}

          {module.type === 'skills' && (
            <div className="grid gap-3 md:grid-cols-2">
              {(module.skillItems || []).map((item) => <SkillSection key={item.title.zh} item={item} locale={locale} />)}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-brand-500 bg-brand-50 p-4 dark:border-brand-100 dark:bg-slate-950">
            <p className="text-sm font-bold text-brand-700 dark:text-brand-100">{t(uiText.quiz, locale)}</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t(module.quiz.question, locale)}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(uiText.answer, locale)}: {t(module.quiz.answer, locale)}</p>
          </div>
        </div>
      )}
    </section>
  );
}

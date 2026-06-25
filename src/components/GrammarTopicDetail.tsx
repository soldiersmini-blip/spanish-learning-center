import { BookOpen, ListChecks, MessageSquareText } from 'lucide-react';
import type { GrammarTopic } from '../types/grammar';
import CommonMistakes from './CommonMistakes';
import ConjugationTable from './ConjugationTable';
import MiniQuiz from './MiniQuiz';
import GrammarNeuralConnections from './neural/GrammarNeuralConnections';

interface Props {
  topic: GrammarTopic;
}

export default function GrammarTopicDetail({ topic }: Props) {
  return (
    <article className="space-y-5">
      <header className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-widest text-coral-600 dark:text-coral-100">{topic.level} · {topic.category}</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{topic.title}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{topic.shortDescription}</p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
          <BookOpen className="h-5 w-5 text-brand-600 dark:text-brand-100" />
          用法解释
        </h3>
        <p className="mt-3 whitespace-pre-line leading-8 text-slate-700 dark:text-slate-300">{topic.explanationZh}</p>
        {topic.explanationEn && <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{topic.explanationEn}</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
          <ListChecks className="h-5 w-5 text-brand-600 dark:text-brand-100" />
          句型公式
        </h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {topic.patterns.map((pattern) => (
            <code key={pattern} className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-slate-950 dark:text-slate-100">
              {pattern}
            </code>
          ))}
        </div>
      </section>

      {!!topic.conjugations?.length && (
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">变位表</h3>
          {topic.conjugations.map((conjugation) => <ConjugationTable key={`${conjugation.verb}-${conjugation.tense}`} conjugation={conjugation} />)}
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
          <MessageSquareText className="h-5 w-5 text-brand-600 dark:text-brand-100" />
          实用场景例句
        </h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {topic.examples.map((example) => (
            <article key={`${example.spanish}-${example.scene}`} className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
              <span className="chip">{example.scene}</span>
              <p className="mt-3 text-lg font-semibold text-brand-700 dark:text-brand-100">{example.spanish}</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{example.zh}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{example.en}</p>
            </article>
          ))}
        </div>
      </section>

      <CommonMistakes mistakes={topic.commonMistakes} />
      <MiniQuiz quizzes={topic.miniQuiz} />
      <GrammarNeuralConnections topic={topic} />
    </article>
  );
}

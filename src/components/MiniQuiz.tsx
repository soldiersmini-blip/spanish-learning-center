import { HelpCircle } from 'lucide-react';
import type { GrammarMiniQuiz } from '../types/grammar';

interface Props {
  quizzes: GrammarMiniQuiz[];
}

export default function MiniQuiz({ quizzes }: Props) {
  return (
    <section className="rounded-lg border border-brand-100 bg-brand-50 p-4 dark:border-brand-700 dark:bg-slate-950">
      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
        <HelpCircle className="h-5 w-5 text-brand-600 dark:text-brand-100" />
        小测验
      </h3>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {quizzes.map((quiz) => (
          <article key={quiz.question} className="rounded-lg bg-white p-3 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-white">{quiz.question}</p>
            <div className="mt-3 grid gap-2">
              {quiz.options.map((option) => (
                <div
                  key={option}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    option === quiz.answer
                      ? 'border-mint-500 bg-mint-100 text-slate-900 dark:bg-mint-500/20 dark:text-white'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {option}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{quiz.explanationZh}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

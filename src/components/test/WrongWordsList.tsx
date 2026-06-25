import type { VocabItem } from '../../types';
import type { TrainingAnswerResult } from '../../types/training';

interface Props {
  results: TrainingAnswerResult[];
  words: VocabItem[];
  onPracticeWrong: () => void;
}

export default function WrongWordsList({ results, words, onPracticeWrong }: Props) {
  const wrongResults = results.filter((item) => !item.correct);
  const getWord = (id: string) => words.find((word) => word.id === id);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-coral-600 dark:text-coral-100">错题本</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{wrongResults.length} 个需要复习的词</h3>
        </div>
        <button
          type="button"
          disabled={wrongResults.length === 0}
          onClick={onPracticeWrong}
          className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          重新练习错题
        </button>
      </div>

      {wrongResults.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">这一轮没有错题，状态很稳。</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {wrongResults.map((result) => {
            const word = getWord(result.question.sourceWordId);
            return (
              <article key={result.question.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <p className="text-lg font-black text-brand-700 dark:text-brand-100">{word?.spanish || result.question.answer}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{word?.zh} · {word?.en}</p>
                {word?.example && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{word.example}</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

import type { VocabItem } from '../../types';
import type { TrainingAnswerResult } from '../../types/training';
import type { VocabTestRecord } from '../../types/vocabTest';
import WrongWordsList from './WrongWordsList';

interface Props {
  record: VocabTestRecord;
  bestAccuracy: number;
  totalWords: number;
  words: VocabItem[];
  results: TrainingAnswerResult[];
  onRestart: () => void;
  onPracticeWrong: () => void;
  onExit: () => void;
}

export default function TestResult({ record, bestAccuracy, totalWords, words, results, onRestart, onPracticeWrong, onExit }: Props) {
  return (
    <main className="mx-auto w-full max-w-[1000px] px-5 py-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto h-3 max-w-xl overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${record.accuracy}%` }} />
        </div>
        <p className="mt-8 text-sm font-bold uppercase tracking-widest text-coral-600 dark:text-coral-100">A1/A2 Vocabulary Test</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{record.level} 词汇掌握测试</h2>

        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
          <Metric label="正确率" value={`${record.accuracy}%`} />
          <Metric label="预计掌握" value={`${record.estimatedKnownWords} / ${totalWords}`} />
          <Metric label="历史最高" value={`${bestAccuracy}%`} />
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onRestart} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
            继续测试
          </button>
          <button type="button" onClick={onPracticeWrong} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            练习错题
          </button>
          <button type="button" onClick={onExit} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            返回训练中心
          </button>
        </div>
      </section>

      <div className="mt-6">
        <WrongWordsList results={results} words={words} onPracticeWrong={onPracticeWrong} />
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

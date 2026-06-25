import { ArrowLeft, RotateCcw, Shuffle, Star } from 'lucide-react';
import type { VocabTestLevel } from '../../types/vocabTest';

interface Props {
  level: VocabTestLevel;
  questionCount: number;
  todayQuestions: number;
  todayAccuracy: number;
  streakDays: number;
  wrongCount: number;
  onExit: () => void;
  onSelectCount: (count: number) => void;
  onRestart: () => void;
  onWrongOnly: () => void;
}

export default function TestHeader({
  level,
  questionCount,
  todayQuestions,
  todayAccuracy,
  streakDays,
  wrongCount,
  onExit,
  onSelectCount,
  onRestart,
  onWrongOnly,
}: Props) {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <button type="button" onClick={onExit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
          返回{level}
        </button>

        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-coral-600 dark:text-coral-100">Vocabulary Test Mode</p>
          <h1 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{level}词汇测试</h1>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2 text-center text-xs dark:bg-slate-900">
          <Metric label="今日测试" value={`${todayQuestions}题`} />
          <Metric label="正确率" value={`${todayAccuracy}%`} />
          <Metric label="连续学习" value={`${streakDays}天`} />
        </div>

        <div className="flex w-full flex-wrap items-center justify-center gap-2 lg:w-auto">
          {[20, 50, 100, 200].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onSelectCount(count)}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${questionCount === count ? 'bg-brand-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}
            >
              {count}题
            </button>
          ))}
          <button type="button" onClick={onRestart} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <Shuffle className="h-4 w-4" />
            随机
          </button>
          <button type="button" disabled={wrongCount === 0} onClick={onWrongOnly} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            错题 {wrongCount}
          </button>
          <button type="button" disabled className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 opacity-40 dark:border-slate-700 dark:text-slate-200">
            <Star className="h-4 w-4" />
            收藏
          </button>
          <button type="button" onClick={onRestart} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <RotateCcw className="h-4 w-4" />
            重新开始
          </button>
        </div>
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-16 px-2">
      <p className="text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

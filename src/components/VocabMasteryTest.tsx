import { useEffect, useMemo, useState } from 'react';
import type { VocabItem } from '../types';
import type { LevelId } from '../types';
import type { VocabTestLevel, VocabTestRecord } from '../types/vocabTest';
import { getBestAccuracy, readVocabTestRecords } from '../utils/vocabTest';
import { warnVocabularyIssuesInDev } from '../utils/validateVocabulary';

interface Props {
  level: VocabTestLevel;
  words: VocabItem[];
  onNavigate: (target: LevelId) => void;
  onStartTest: (count: number) => void;
}

export default function VocabMasteryTest({ level, words, onNavigate, onStartTest }: Props) {
  const [records, setRecords] = useState<VocabTestRecord[]>(() => readVocabTestRecords(level));

  useEffect(() => {
    setRecords(readVocabTestRecords(level));
    warnVocabularyIssuesInDev(level, words);
  }, [level, words]);

  const totalWords = words.length;
  const bestAccuracy = getBestAccuracy(records);
  const bestRecord = records.reduce<VocabTestRecord | null>((best, record) => {
    if (!best || record.accuracy > best.accuracy) return record;
    return best;
  }, null);
  const isEligibleForNextLevel = bestAccuracy >= 90;
  const nextLevel = level === 'A1' ? 'a2' : 'b1';
  const nextLevelLabel = level === 'A1' ? '进入 A2' : '查看 B1 预留页';

  const summary = useMemo(() => {
    const accuracy = bestRecord?.accuracy || 0;
    const known = bestRecord?.estimatedKnownWords || 0;
    return { accuracy, known };
  }, [bestRecord]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-coral-600 dark:text-coral-100">{level} Vocabulary Test</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{level}词汇掌握度测试</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            进入独立测试模式，随机抽查当前等级词汇。题目不会提前显示例句或翻译，答题后再展开解析。
          </p>
        </div>

        <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[360px]">
          <Metric label="当前词库" value={`${totalWords}词`} />
          <Metric label="历史最高" value={`${summary.accuracy}%`} />
          <Metric label="估算掌握" value={`${summary.known} / ${totalWords}`} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {[20, 50, 100].map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onStartTest(Math.min(count, totalWords))}
            className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
          >
            开始 {Math.min(count, totalWords)} 题测试
          </button>
        ))}
      </div>

      {isEligibleForNextLevel && (
        <div className="mt-5 rounded-xl border border-mint-500 bg-mint-100 p-4 text-sm text-slate-800 dark:bg-mint-500/20 dark:text-slate-100">
          <p className="font-semibold">
            {level === 'A1'
              ? '你的 A1 词汇掌握度已经达到 90% 以上，可以开始进入 A2。'
              : '你的 A2 词汇掌握度已经达到 90% 以上，可以开始准备 B1。'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="rounded-md border border-mint-500 px-3 py-2 font-semibold">
              继续巩固 {level}
            </button>
            <button type="button" onClick={() => onNavigate(nextLevel)} className="rounded-md bg-mint-500 px-3 py-2 font-semibold text-white">
              {nextLevelLabel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

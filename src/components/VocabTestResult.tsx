import type { VocabItem } from '../types';
import type { VocabAnswerResult, VocabTestRecord } from '../types/vocabTest';

interface Props {
  record: VocabTestRecord;
  bestAccuracy: number;
  totalWords: number;
  words: VocabItem[];
  results: VocabAnswerResult[];
  onRestart: () => void;
  onClose: () => void;
}

export default function VocabTestResult({ record, bestAccuracy, totalWords, words, results, onRestart, onClose }: Props) {
  const wrongResults = results.filter((item) => !item.correct && !item.unknown);
  const unknownResults = results.filter((item) => item.unknown);
  const getWord = (id: string) => words.find((word) => word.id === id);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-widest text-coral-600 dark:text-coral-100">测试完成</p>
      <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">本轮正确率：{record.accuracy}%</h3>
      <p className="mt-2 text-slate-600 dark:text-slate-300">估算掌握词汇：{record.estimatedKnownWords} / {totalWords}</p>
      <p className="text-slate-600 dark:text-slate-300">历史最高：{bestAccuracy}%</p>
      <div className="mt-4 rounded-lg bg-brand-50 p-4 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        建议：继续复习错误词和不认识的词，再做一轮随机测试会更接近真实掌握度。
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ReviewList title="答错词汇" results={wrongResults} getWord={getWord} />
        <ReviewList title="不认识词汇" results={unknownResults} getWord={getWord} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onRestart} className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          重新测试
        </button>
        <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          回到学习页面
        </button>
      </div>
    </section>
  );
}

function ReviewList({ title, results, getWord }: {
  title: string;
  results: VocabAnswerResult[];
  getWord: (id: string) => VocabItem | undefined;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <h4 className="font-bold text-slate-950 dark:text-white">{title} <span className="text-sm text-slate-500">{results.length}</span></h4>
      {results.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">本轮没有记录。</p>
      ) : (
        <div className="mt-3 max-h-64 space-y-2 overflow-auto">
          {results.map((result) => {
            const word = getWord(result.question.sourceWordId);
            return (
              <div key={result.question.id} className="rounded-md bg-white p-3 text-sm dark:bg-slate-900">
                <p className="font-semibold text-brand-700 dark:text-brand-100">{word?.spanish || result.question.prompt}</p>
                <p className="text-slate-600 dark:text-slate-300">{word?.zh} · {word?.en}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

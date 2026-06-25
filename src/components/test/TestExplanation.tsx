import { useEffect, useState } from 'react';
import type { VocabItem } from '../../types';
import type { TrainingQuestion } from '../../types/training';
import type { VocabTestQuestion } from '../../types/vocabTest';
import { getVocabularyLearningInsight } from '../../utils/vocabTest';
import NeuralTrigger from '../neural/NeuralTrigger';

interface Props {
  question: VocabTestQuestion | TrainingQuestion;
  sourceWord?: VocabItem;
  correct: boolean;
  unknown: boolean;
  showExplanation?: boolean;
  showExample?: boolean;
}

export default function TestExplanation({
  question,
  sourceWord,
  correct,
  unknown,
  showExplanation = true,
  showExample = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const insight = getVocabularyLearningInsight(sourceWord);

  useEffect(() => {
    setOpen(false);
  }, [question.id]);

  return (
    <section className={`rounded-2xl border p-4 ${correct && !unknown ? 'border-mint-500 bg-mint-50 dark:bg-mint-500/10' : 'border-coral-300 bg-coral-50 dark:bg-coral-600/10'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950 dark:text-white">{correct && !unknown ? '✓ 回答正确' : '这题没有答对'}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            正确答案：<strong className="text-slate-950 dark:text-white">{question.answer}</strong>
          </p>
          {sourceWord?.id && (
            <div className="mt-3">
              <NeuralTrigger nodeId={sourceWord.id} source="quiz-result" label="继续神经元学习" compact />
            </div>
          )}
        </div>
        {showExplanation && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {open ? '收起解析' : '查看解析'}
          </button>
        )}
      </div>

      {showExplanation && open && (
        <div className="mt-5 grid gap-4 text-sm text-slate-700 dark:text-slate-200">
          {sourceWord && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{sourceWord.spanish}</p>
              <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{sourceWord.zh} · {sourceWord.en}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">为什么</p>
            <p className="mt-1 leading-7">{insight.why}</p>
          </div>
          {showExample && sourceWord?.example && (
            <div className="rounded-xl bg-white p-4 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">例句</p>
              <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">{sourceWord.example}</p>
              {sourceWord.exampleZh && <p className="mt-1 text-slate-600 dark:text-slate-300">{sourceWord.exampleZh}</p>}
            </div>
          )}
          {insight.collocations.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">常见搭配</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {insight.collocations.map((item) => (
                  <span key={item} className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl bg-white p-4 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">学习提示</p>
            <p className="mt-2 leading-7">{insight.hint}</p>
          </div>
        </div>
      )}
    </section>
  );
}

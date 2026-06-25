import type { VocabItem } from '../../types';
import type { VocabTestQuestion } from '../../types/vocabTest';
import TestExplanation from './TestExplanation';

interface Props {
  question: VocabTestQuestion;
  questionIndex: number;
  totalQuestions: number;
  sourceWord?: VocabItem;
  selectedAnswer: string | null;
  unknown: boolean;
  onAnswer: (answer: string) => void;
  onUnknown: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function TestCard({
  question,
  questionIndex,
  totalQuestions,
  sourceWord,
  selectedAnswer,
  unknown,
  onAnswer,
  onUnknown,
  onNext,
  onPrevious,
}: Props) {
  const answered = selectedAnswer !== null || unknown;
  const correct = selectedAnswer === question.answer;
  const progress = Math.round(((questionIndex + 1) / totalQuestions) * 100);

  function optionClass(option: string) {
    if (!answered) return 'border-slate-200 bg-white hover:border-brand-500 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800';
    if (option === question.answer) return 'border-mint-500 bg-mint-100 text-slate-950 dark:bg-mint-500/20 dark:text-white';
    if (option === selectedAnswer) return 'border-coral-600 bg-coral-100 text-slate-950 dark:bg-coral-600/20 dark:text-white';
    return 'border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-900';
  }

  return (
    <section className="mx-auto w-full max-w-[900px] rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900 sm:p-8">
      <div className="text-center">
        <p className="text-base font-bold text-slate-700 dark:text-slate-200">第 {questionIndex + 1} / {totalQuestions} 题</p>
        <div className="mx-auto mt-4 h-3 max-w-xl overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm font-semibold text-brand-700 dark:text-brand-100">{progress}%</p>
      </div>

      <div className="mt-10 rounded-2xl bg-slate-50 p-6 text-center dark:bg-slate-950">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{getInstruction(question)}</p>
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{getPromptLabel(question)}</p>
        <h2 className="mx-auto mt-3 max-w-2xl whitespace-pre-line text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
          {question.prompt}
        </h2>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            disabled={answered}
            onClick={() => onAnswer(option)}
            className={`min-h-16 rounded-2xl border px-5 py-4 text-left text-base font-bold transition ${optionClass(option)}`}
          >
            <span className="mr-3 text-slate-400">{index + 1}</span>
            {option}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={questionIndex === 0}
            onClick={onPrevious}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            上一题
          </button>
          <button
            type="button"
            disabled={!answered || !correct}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
          >
            我认识
          </button>
          <button
            type="button"
            disabled={answered}
            onClick={onUnknown}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            我不认识
          </button>
        </div>
        <button
          type="button"
          disabled={!answered}
          onClick={onNext}
          className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {questionIndex + 1 === totalQuestions ? '完成测试' : '下一题'}
        </button>
      </div>

      {answered && (
        <div className="mt-6">
          <TestExplanation question={question} sourceWord={sourceWord} correct={correct} unknown={unknown} />
        </div>
      )}
    </section>
  );
}

function getInstruction(question: VocabTestQuestion) {
  if (question.promptType === 'spanish-to-zh') return '请选择正确中文意思';
  if (question.promptType === 'zh-to-spanish') return '请选择正确西班牙语';
  return '请选择最适合填入空格的西班牙语';
}

function getPromptLabel(question: VocabTestQuestion) {
  if (question.promptType === 'spanish-to-zh') return '西班牙语';
  if (question.promptType === 'zh-to-spanish') return '中文意思';
  return '例句填空';
}

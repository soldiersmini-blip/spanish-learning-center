import type { VocabItem } from '../../types';
import type { TrainingQuestion } from '../../types/training';
import TestExplanation from '../test/TestExplanation';
import ChoiceQuestion from './ChoiceQuestion';
import FillChoiceQuestion from './FillChoiceQuestion';
import TypingQuestion from './TypingQuestion';

interface Props {
  question: TrainingQuestion;
  questionIndex: number;
  totalQuestions: number;
  sourceWord?: VocabItem;
  selectedAnswer: string | null;
  typedAnswer: string;
  unknown: boolean;
  accentWarning: boolean;
  showExplanation: boolean;
  showExample: boolean;
  onAnswer: (answer: string) => void;
  onTypingChange: (value: string) => void;
  onTypingSubmit: () => void;
  onUnknown: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function TrainingQuestionCard({
  question,
  questionIndex,
  totalQuestions,
  sourceWord,
  selectedAnswer,
  typedAnswer,
  unknown,
  accentWarning,
  showExplanation,
  showExample,
  onAnswer,
  onTypingChange,
  onTypingSubmit,
  onUnknown,
  onNext,
  onPrevious,
}: Props) {
  const answered = selectedAnswer !== null || unknown;
  const correct = selectedAnswer === question.answer;
  const progress = Math.round(((questionIndex + 1) / totalQuestions) * 100);

  return (
    <section className="mx-auto w-full max-w-[900px] rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900 sm:p-8">
      <div className="text-center">
        <p className="text-base font-bold text-slate-700 dark:text-slate-200">第 {questionIndex + 1} / {totalQuestions} 题</p>
        <div className="mx-auto mt-4 h-3 max-w-xl overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm font-semibold text-brand-700 dark:text-brand-100">{progress}% · {modeLabel(question.mode)}</p>
      </div>

      <div className="mt-10 rounded-2xl bg-slate-50 p-6 text-center dark:bg-slate-950">
        <p className="text-sm font-black text-slate-500 dark:text-slate-400">{question.instruction}</p>
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{question.promptLabel}</p>
        <h2 className="mx-auto mt-3 max-w-2xl whitespace-pre-line text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
          {question.prompt}
        </h2>
      </div>

      {question.mode === 'word-recognition' && (
        <ChoiceQuestion question={question} answered={answered} selectedAnswer={selectedAnswer} onAnswer={onAnswer} />
      )}
      {question.mode === 'sentence-fill-choice' && (
        <FillChoiceQuestion question={question} answered={answered} selectedAnswer={selectedAnswer} onAnswer={onAnswer} />
      )}
      {question.mode === 'typing' && (
        <TypingQuestion
          question={question}
          answered={answered}
          typedAnswer={typedAnswer}
          accentWarning={accentWarning}
          onChange={onTypingChange}
          onSubmit={onTypingSubmit}
        />
      )}

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
          {questionIndex + 1 === totalQuestions ? '完成训练' : '下一题'}
        </button>
      </div>

      {answered && (
        <div className="mt-6">
          <TestExplanation question={question} sourceWord={sourceWord} correct={correct} unknown={unknown} showExplanation={showExplanation} showExample={showExample} />
        </div>
      )}
    </section>
  );
}

function modeLabel(mode: TrainingQuestion['mode']) {
  if (mode === 'word-recognition') return '百词斩选择';
  if (mode === 'sentence-fill-choice') return '填空选择';
  return '手动输入';
}

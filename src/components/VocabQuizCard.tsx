import type { VocabItem } from '../types';
import type { VocabTestQuestion } from '../types/vocabTest';
import { getVocabularyLearningInsight } from '../utils/vocabTest';

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
}

export default function VocabQuizCard({
  question,
  questionIndex,
  totalQuestions,
  sourceWord,
  selectedAnswer,
  unknown,
  onAnswer,
  onUnknown,
  onNext,
}: Props) {
  const answered = selectedAnswer !== null || unknown;
  const correct = selectedAnswer === question.answer;
  const progress = Math.round(((questionIndex + 1) / totalQuestions) * 100);
  const insight = getVocabularyLearningInsight(sourceWord);

  function optionClass(option: string) {
    if (!answered) return 'border-slate-200 bg-white hover:border-brand-500 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800';
    if (option === question.answer) return 'border-mint-500 bg-mint-100 text-slate-950 dark:bg-mint-500/20 dark:text-white';
    if (option === selectedAnswer) return 'border-coral-600 bg-coral-100 text-slate-950 dark:bg-coral-600/20 dark:text-white';
    return 'border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-900';
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">第 {questionIndex + 1} / {totalQuestions} 题</p>
        <p className="text-sm font-semibold text-brand-700 dark:text-brand-100">{progress}%</p>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="rounded-lg bg-slate-50 p-5 dark:bg-slate-950">
        <p className="text-center text-sm font-semibold text-slate-500 dark:text-slate-400">{getInstruction(question)}</p>
        <div className="mt-4 text-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{getPromptLabel(question)}</p>
          <h3 className="mt-2 whitespace-pre-line text-3xl font-bold leading-tight text-slate-950 dark:text-white">{question.prompt}</h3>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            disabled={answered}
            onClick={() => onAnswer(option)}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${optionClass(option)}`}
          >
            <span className="mr-2 text-slate-400">{String.fromCharCode(65 + index)}.</span>
            {option}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={answered}
          onClick={onUnknown}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          我不认识
        </button>
        {answered && (
          <button type="button" onClick={onNext} className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            {questionIndex + 1 === totalQuestions ? '查看结果' : '下一题'}
          </button>
        )}
      </div>

      {answered && (
        <div className={`mt-5 rounded-lg border p-4 text-sm ${correct && !unknown ? 'border-mint-500 bg-mint-100 text-slate-800 dark:bg-mint-500/20 dark:text-slate-100' : 'border-coral-300 bg-coral-100 text-slate-800 dark:bg-coral-600/20 dark:text-slate-100'}`}>
          <p className="font-bold">{correct && !unknown ? '回答正确' : '这题没有答对'}</p>
          <div className="mt-4 grid gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">正确答案</p>
              <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{question.answer}</p>
            </div>
            {sourceWord && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">意思</p>
                <p className="mt-1 text-slate-800 dark:text-slate-100">{sourceWord.zh} · {sourceWord.en}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">为什么</p>
              <p className="mt-1 leading-6">{insight.why}</p>
            </div>
            {sourceWord?.example && (
              <div className="rounded-lg bg-white p-4 dark:bg-slate-900">
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
                    <span key={item} className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{item}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-lg bg-white p-4 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">学习提示</p>
              <p className="mt-2 leading-6">{insight.hint}</p>
            </div>
          </div>
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

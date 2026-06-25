import { useEffect, useRef, useState } from 'react';
import type { TrainingQuestion } from '../../types/training';

interface Props {
  question: TrainingQuestion;
  answered: boolean;
  typedAnswer: string;
  accentWarning: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function TypingQuestion({ question, answered, typedAnswer, accentWarning, onChange, onSubmit }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localValue, setLocalValue] = useState(typedAnswer);

  useEffect(() => {
    setLocalValue('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [question.id]);

  function update(value: string) {
    setLocalValue(value);
    onChange(value);
  }

  return (
    <div className="mt-8">
      {question.chineseHint && (
        <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-center dark:border-brand-700 dark:bg-brand-600/10">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">中文提示</p>
          <p className="mt-2 text-base font-bold text-slate-800 dark:text-slate-100">{question.chineseHint}</p>
        </div>
      )}
      {question.typingHint && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-950">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">提示</p>
          <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{question.typingHint}</p>
        </div>
      )}
      <label className="mt-6 block">
        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">请输入正确单词</span>
        <input
          ref={inputRef}
          value={localValue}
          disabled={answered}
          onChange={(event) => update(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit();
          }}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-2xl font-black text-slate-950 outline-none focus:border-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          placeholder="pedir"
        />
      </label>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          disabled={answered || !localValue.trim()}
          onClick={onSubmit}
          className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-40"
        >
          提交答案
        </button>
      </div>
      {accentWarning && (
        <p className="mt-4 rounded-xl bg-amber-100 p-3 text-center text-sm font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
          答案基本正确，请注意西班牙语重音符号。
        </p>
      )}
    </div>
  );
}

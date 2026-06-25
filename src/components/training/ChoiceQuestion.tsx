import type { TrainingQuestion } from '../../types/training';

interface Props {
  question: TrainingQuestion;
  answered: boolean;
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
}

export default function ChoiceQuestion({ question, answered, selectedAnswer, onAnswer }: Props) {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      {(question.options || []).map((option, index) => (
        <button
          key={option}
          type="button"
          disabled={answered}
          onClick={() => onAnswer(option)}
          className={`min-h-16 rounded-2xl border px-5 py-4 text-left text-base font-bold transition ${optionClass(option, question.answer, selectedAnswer, answered)}`}
        >
          <span className="mr-3 text-slate-400">{index + 1}</span>
          {option}
        </button>
      ))}
    </div>
  );
}

function optionClass(option: string, answer: string, selectedAnswer: string | null, answered: boolean) {
  if (!answered) return 'border-slate-200 bg-white hover:border-brand-500 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800';
  if (option === answer) return 'border-mint-500 bg-mint-100 text-slate-950 dark:bg-mint-500/20 dark:text-white';
  if (option === selectedAnswer) return 'border-coral-600 bg-coral-100 text-slate-950 dark:bg-coral-600/20 dark:text-white';
  return 'border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-900';
}

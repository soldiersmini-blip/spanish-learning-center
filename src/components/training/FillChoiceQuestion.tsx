import type { TrainingQuestion } from '../../types/training';
import ChoiceQuestion from './ChoiceQuestion';

interface Props {
  question: TrainingQuestion;
  answered: boolean;
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
}

export default function FillChoiceQuestion({ question, answered, selectedAnswer, onAnswer }: Props) {
  return (
    <>
      {question.chineseHint && (
        <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-center dark:border-brand-700 dark:bg-brand-600/10">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">中文提示</p>
          <p className="mt-2 text-base font-bold text-slate-800 dark:text-slate-100">{question.chineseHint}</p>
        </div>
      )}
      <ChoiceQuestion question={question} answered={answered} selectedAnswer={selectedAnswer} onAnswer={onAnswer} />
    </>
  );
}

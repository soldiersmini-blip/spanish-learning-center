import type { VocabTestLevel } from '../../types/vocabTest';
import type { TrainingSettings as Settings } from '../../types/training';
import TrainingSettings from './TrainingSettings';

interface Props {
  level: VocabTestLevel;
  settings: Settings;
  totalWords: number;
  wrongCount: number;
  onChange: (settings: Settings) => void;
  onStart: () => void;
}

export default function TrainingCenter({ level, settings, totalWords, wrongCount, onChange, onStart }: Props) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-6 h-1 w-40 rounded-full bg-brand-600" />
        <p className="text-sm font-black uppercase tracking-[0.28em] text-coral-600 dark:text-coral-100">{level} Vocabulary Training</p>
        <h1 className="mt-3 text-4xl font-black text-slate-950 dark:text-white sm:text-5xl">{level} 词汇训练中心</h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
          请选择训练模式。你可以混合百词斩选择、句子填空和手动输入，让测试负责检查记忆，让解析负责建立理解。
        </p>
        <div className="mx-auto mt-5 flex max-w-xl justify-center gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
          <span>当前词库：{totalWords} 词</span>
          <span>错题本：{wrongCount} 词</span>
        </div>
      </header>

      <TrainingSettings settings={settings} wrongCount={wrongCount} onChange={onChange} onStart={onStart} />
    </main>
  );
}

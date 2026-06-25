import { CheckCircle2, Headphones, Image, Keyboard, ListChecks, Volume2 } from 'lucide-react';
import type { EnabledTrainingMode, TrainingMode } from '../../types/training';

const modes: Array<{
  id: TrainingMode;
  title: string;
  description: string;
  enabled: boolean;
  icon: typeof CheckCircle2;
}> = [
  {
    id: 'word-recognition',
    title: '百词斩式选择题',
    description: '看西班牙语选中文，或看中文选西班牙语。',
    enabled: true,
    icon: CheckCircle2,
  },
  {
    id: 'sentence-fill-choice',
    title: '填空选择题',
    description: '带中文语境，在句子中选择最合适的词。',
    enabled: true,
    icon: ListChecks,
  },
  {
    id: 'typing',
    title: '手动输入模式',
    description: '根据句子和提示自己拼写西班牙语单词。',
    enabled: true,
    icon: Keyboard,
  },
  {
    id: 'audio-choice',
    title: '听音选择',
    description: '预留 TTS 接入。',
    enabled: false,
    icon: Volume2,
  },
  {
    id: 'audio-spelling',
    title: '听音拼写',
    description: '预留听写训练。',
    enabled: false,
    icon: Headphones,
  },
  {
    id: 'image-choice',
    title: '看图猜词',
    description: '预留图片词汇训练。',
    enabled: false,
    icon: Image,
  },
];

interface Props {
  selected: EnabledTrainingMode[];
  onChange: (modes: EnabledTrainingMode[]) => void;
}

export default function TrainingModeSelector({ selected, onChange }: Props) {
  function toggle(mode: TrainingMode, enabled: boolean) {
    if (!enabled) return;
    const typedMode = mode as EnabledTrainingMode;
    if (selected.includes(typedMode)) {
      const next = selected.filter((item) => item !== typedMode);
      onChange(next.length ? next : selected);
      return;
    }
    onChange([...selected, typedMode]);
  }

  return (
    <section>
      <h3 className="text-lg font-black text-slate-950 dark:text-white">训练模式</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const active = selected.includes(mode.id as EnabledTrainingMode);
          return (
            <button
              key={mode.id}
              type="button"
              disabled={!mode.enabled}
              onClick={() => toggle(mode.id, mode.enabled)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-brand-600 bg-brand-50 dark:border-brand-300 dark:bg-brand-600/10'
                  : 'border-slate-200 bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900'
              } ${!mode.enabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className={`rounded-xl p-2 ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="flex items-center gap-2 font-black text-slate-950 dark:text-white">
                    {active ? '☑' : '□'} {mode.title}
                    {!mode.enabled && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-950">预留</span>}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">{mode.description}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

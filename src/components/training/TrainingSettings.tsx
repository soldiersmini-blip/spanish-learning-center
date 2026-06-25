import type { TrainingQuestionCount, TrainingScope, TrainingSettings as Settings, TypingHintLevel } from '../../types/training';
import TrainingModeSelector from './TrainingModeSelector';

const counts: TrainingQuestionCount[] = [20, 50, 100, 200];
const scopes: Array<{ id: TrainingScope; label: string; enabled: boolean }> = [
  { id: 'all', label: '全部当前等级', enabled: true },
  { id: 'current-category', label: '当前分类', enabled: false },
  { id: 'current-section', label: '当前章节', enabled: false },
  { id: 'favorites', label: '收藏词', enabled: false },
  { id: 'wrong', label: '错题本', enabled: true },
  { id: 'recent', label: '最近学习', enabled: false },
  { id: 'custom', label: '自定义', enabled: false },
];
const hints: Array<{ id: TypingHintLevel; label: string }> = [
  { id: 'none', label: '无提示' },
  { id: 'zh', label: '中文提示' },
  { id: 'first-letter', label: '首字母提示' },
  { id: 'edge-letters', label: '首尾字母提示' },
  { id: 'length', label: '单词长度提示' },
];

interface Props {
  settings: Settings;
  wrongCount: number;
  onChange: (settings: Settings) => void;
  onStart: () => void;
}

export default function TrainingSettings({ settings, wrongCount, onChange, onStart }: Props) {
  return (
    <section className="mx-auto w-full max-w-[1000px] rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900 sm:p-8">
      <TrainingModeSelector selected={settings.modes} onChange={(modes) => onChange({ ...settings, modes })} />

      <section className="mt-8">
        <h3 className="text-lg font-black text-slate-950 dark:text-white">训练题数</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {counts.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onChange({ ...settings, questionCount: count })}
              className={`rounded-xl px-5 py-3 text-sm font-black ${settings.questionCount === count ? 'bg-brand-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}
            >
              {count}题
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h3 className="text-lg font-black text-slate-950 dark:text-white">词汇范围</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scopes.map((scope) => (
            <button
              key={scope.id}
              type="button"
              disabled={!scope.enabled || (scope.id === 'wrong' && wrongCount === 0)}
              onClick={() => onChange({ ...settings, scope: scope.id })}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                settings.scope === scope.id
                  ? 'border-brand-600 bg-brand-50 text-brand-800 dark:border-brand-300 dark:bg-brand-600/10 dark:text-brand-100'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
              } disabled:opacity-40`}
            >
              {settings.scope === scope.id ? '☑' : '□'} {scope.label}
              {scope.id === 'wrong' && <span className="ml-2 text-xs text-slate-500">({wrongCount})</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">输入模式提示等级</h3>
          <div className="mt-3 grid gap-2">
            {hints.map((hint) => (
              <button
                key={hint.id}
                type="button"
                onClick={() => onChange({ ...settings, typingHintLevel: hint.id })}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-bold ${settings.typingHintLevel === hint.id ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-600/10 dark:text-brand-100' : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200'}`}
              >
                {settings.typingHintLevel === hint.id ? '○' : '○'} {hint.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">训练显示</h3>
          <div className="mt-3 grid gap-2">
            <Toggle label="是否显示中文提示" checked={settings.showChineseHint} onChange={(checked) => onChange({ ...settings, showChineseHint: checked })} />
            <Toggle label="例句：答题后显示" checked={settings.showExampleAfterAnswer} onChange={(checked) => onChange({ ...settings, showExampleAfterAnswer: checked })} />
            <Toggle label="是否显示解析" checked={settings.showExplanation} onChange={(checked) => onChange({ ...settings, showExplanation: checked })} />
            <Toggle label="是否立即判分" checked={settings.instantFeedback} onChange={(checked) => onChange({ ...settings, instantFeedback: checked })} />
          </div>
        </div>
      </section>

      <div className="mt-8 flex justify-center">
        <button type="button" onClick={onStart} className="rounded-2xl bg-brand-600 px-8 py-4 text-base font-black text-white hover:bg-brand-700">
          开始训练
        </button>
      </div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {checked ? '☑' : '□'} {label}
    </button>
  );
}

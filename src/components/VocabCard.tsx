import { Volume2 } from 'lucide-react';
import type { Locale, VocabItem } from '../types';
import { t, uiText } from '../i18n';
import { findNeuralNodeBySpanish } from '../utils/neural/neuralEngine';
import NeuralInlineLinks from './neural/NeuralInlineLinks';

interface Props {
  item: VocabItem;
  locale: Locale;
}

export default function VocabCard({ item, locale }: Props) {
  const neuralNodeId = item.id || findNeuralNodeBySpanish(item.spanish)?.id;

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-brand-700 dark:text-brand-100">{item.spanish}</h4>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{item.zh} · {item.en}</p>
          {item.partOfSpeech && (
            <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              {item.partOfSpeech}
            </span>
          )}
        </div>
        <button className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" title={t(uiText.audio, locale)} type="button">
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{item.example}</p>
      {item.exampleZh && <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.exampleZh}</p>}
      <NeuralInlineLinks nodeId={neuralNodeId} />
    </article>
  );
}

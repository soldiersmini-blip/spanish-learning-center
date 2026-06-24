import { Volume2 } from 'lucide-react';
import type { Locale, SkillItem } from '../types';
import { t, uiText } from '../i18n';

interface Props {
  item: SkillItem;
  locale: Locale;
}

export default function SkillSection({ item, locale }: Props) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{t(item.title, locale)}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{t(item.content, locale)}</p>
      <div className="mt-3 space-y-2">
        {item.examples.map((example) => (
          <div key={example} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm dark:bg-slate-900">
            <span>{example}</span>
            <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" title={t(uiText.audio, locale)} type="button">
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}

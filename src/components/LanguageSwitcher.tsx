import type { Locale } from '../types';
import { localeNames } from '../i18n';

interface Props {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

export default function LanguageSwitcher({ locale, onChange }: Props) {
  return (
    <div className="flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" aria-label="Language switcher">
      {(Object.keys(localeNames) as Locale[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-md px-3 py-2 text-sm transition ${
            locale === item
              ? 'bg-brand-600 text-white'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          {localeNames[item]}
        </button>
      ))}
    </div>
  );
}

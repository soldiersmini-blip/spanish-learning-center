import type { LevelId, Locale } from '../types';
import { t, uiText } from '../i18n';
import BrandLogo from './BrandLogo';

interface Props {
  locale: Locale;
  onNavigate: (level: LevelId) => void;
}

const levels: Array<{ id: LevelId; title: Record<Locale, string>; enabled: boolean }> = [
  { id: 'a1', title: { zh: 'A1 入门', en: 'A1 Beginner', es: 'A1 Inicial' }, enabled: true },
  { id: 'a2', title: { zh: 'A2 初级进阶', en: 'A2 Elementary Plus', es: 'A2 Básico avanzado' }, enabled: true },
  { id: 'b1', title: { zh: 'B1 预留窗口', en: 'B1 Reserved', es: 'B1 Reservado' }, enabled: false },
  { id: 'b2', title: { zh: 'B2 预留窗口', en: 'B2 Reserved', es: 'B2 Reservado' }, enabled: false },
];

const heroCopy: Record<Locale, string[]> = {
  zh: ['A1-A2 系统化自学路线', '从零基础到独立交流'],
  en: ['A1-A2 structured self-study path', 'From zero basics to independent communication'],
  es: ['Ruta sistemática de autoaprendizaje A1-A2', 'Desde cero hasta comunicarte con autonomía'],
};

export default function Home({ locale, onNavigate }: Props) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-104px)] w-full max-w-5xl flex-col justify-center px-5 py-10">
      <div className="mb-9 text-center">
        <BrandLogo variant="hero" size="large" className="mb-6 justify-center" animated={false} />
        <h1 className="text-4xl font-bold tracking-normal text-slate-950 dark:text-white sm:text-5xl">{t(uiText.appTitle, locale)}</h1>
        <div className="mt-4 space-y-1 text-base font-medium text-slate-600 dark:text-slate-300 sm:text-lg">
          {heroCopy[locale].map((line) => <p key={line}>{line}</p>)}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {levels.map((level) => (
          <button
            key={level.id}
            type="button"
            onClick={() => onNavigate(level.id)}
            className={`card min-h-40 p-6 text-left transition hover:-translate-y-1 hover:border-brand-500 ${
              level.enabled ? 'cursor-pointer' : 'cursor-pointer opacity-80'
            }`}
          >
            <span className="text-sm font-semibold uppercase tracking-widest text-coral-600 dark:text-coral-100">{level.id.toUpperCase()}</span>
            <span className="mt-4 block text-2xl font-bold text-slate-950 dark:text-white">{t(level.title, locale)}</span>
            <span className="mt-5 inline-flex rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
              {level.enabled ? t(uiText.enter, locale) : t(uiText.comingSoon, locale)}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

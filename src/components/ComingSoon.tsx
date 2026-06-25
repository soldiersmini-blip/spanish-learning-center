import type { LevelId, Locale } from '../types';
import { t, uiText } from '../i18n';
import PageHeader from './navigation/PageHeader';
import type { RouteId } from '../navigation/routes';

interface Props {
  level: Extract<LevelId, 'b1' | 'b2'>;
  locale: Locale;
  onHome: () => void;
  onNavigateRoute: (routeId: RouteId) => void;
}

export default function ComingSoon({ level, locale, onHome, onNavigateRoute }: Props) {
  return (
    <>
      <PageHeader
        routeId={level}
        title={`${level.toUpperCase()} ${t(uiText.reservedTitle, locale)}`}
        eyebrow={level.toUpperCase()}
        onBack={onHome}
        onNavigateRoute={onNavigateRoute}
      />
      <main className="mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-3xl flex-col justify-center px-5 py-10">
        <section className="card p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-coral-600 dark:text-coral-100">{level.toUpperCase()}</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">{t(uiText.reservedTitle, locale)}</h1>
          <p className="mt-4 text-slate-600 dark:text-slate-300">{t(uiText.comingSoon, locale)}</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">{t(uiText.reservedBody, locale)}</p>
        </section>
      </main>
    </>
  );
}

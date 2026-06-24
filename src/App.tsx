import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import Home from './components/Home';
import LanguageSwitcher from './components/LanguageSwitcher';
import LevelPage from './components/LevelPage';
import ComingSoon from './components/ComingSoon';
import BackToTopButton from './components/BackToTopButton';
import { a1Content } from './data/a1';
import { a2Content } from './data/a2';
import type { LevelId, Locale } from './types';
import { t, uiText } from './i18n';

function getInitialRoute(): LevelId | 'home' {
  const path = window.location.pathname.replace('/', '').toLowerCase();
  return ['a1', 'a2', 'b1', 'b2'].includes(path) ? path as LevelId : 'home';
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('spanish-locale') as Locale) || 'zh');
  const [page, setPage] = useState<LevelId | 'home'>(getInitialRoute);
  const [dark, setDark] = useState(() => localStorage.getItem('spanish-theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('spanish-locale', locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('spanish-theme', dark ? 'dark' : 'light');
  }, [dark]);

  function navigate(target: LevelId | 'home') {
    setPage(target);
    window.history.pushState({}, '', target === 'home' ? '/' : `/${target}`);
  }

  useEffect(() => {
    const onPop = () => setPage(getInitialRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-paper/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <button type="button" onClick={() => navigate('home')} className="text-left font-bold text-slate-950 dark:text-white">
            {t(uiText.appTitle, locale)}
          </button>
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} onChange={setLocale} />
            <button
              type="button"
              onClick={() => setDark((value) => !value)}
              className="rounded-lg border border-slate-200 bg-white p-3 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              title={dark ? t(uiText.light, locale) : t(uiText.dark, locale)}
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {page === 'home' && <Home locale={locale} onNavigate={navigate} />}
      {page === 'a1' && <LevelPage content={a1Content} locale={locale} onHome={() => navigate('home')} />}
      {page === 'a2' && <LevelPage content={a2Content} locale={locale} onHome={() => navigate('home')} />}
      {page === 'b1' && <ComingSoon level="b1" locale={locale} onHome={() => navigate('home')} />}
      {page === 'b2' && <ComingSoon level="b2" locale={locale} onHome={() => navigate('home')} />}
      <BackToTopButton />
    </div>
  );
}

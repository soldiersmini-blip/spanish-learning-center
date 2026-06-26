import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthProvider } from './auth/AuthProvider';
import AccountMenu from './components/account/AccountMenu';
import BackToTopButton from './components/BackToTopButton';
import BrandLogo from './components/BrandLogo';
import Footer from './components/Footer';
import Home from './components/Home';
import LanguageSwitcher from './components/LanguageSwitcher';
import LevelPage from './components/LevelPage';
import NeuralProvider from './components/neural/NeuralProvider';
import { a1Content } from './data/a1';
import { a1VocabularyItems } from './data/vocabulary/a1';
import { a2Content } from './data/a2';
import { a2VocabularyItems } from './data/vocabulary/a2';
import { b1Content } from './data/b1';
import { b2Content } from './data/b2';
import { t, uiText } from './i18n';
import { buildHashUrl, routeIdToHash } from './navigation/hashRoutes';
import type { RouteId } from './navigation/routes';
import AccountPage from './pages/account/AccountPage';
import NeuralWorkspacePage from './pages/NeuralWorkspacePage';
import SettingsPage from './pages/SettingsPage';
import VocabularyTestPage from './pages/VocabularyTestPage';
import type { LevelId, Locale } from './types';
import { findNeuralEngineNode } from './utils/neural/neuralEngine';

type AccountPageId =
  | 'account'
  | 'account-login'
  | 'account-register'
  | 'account-verify-email'
  | 'account-password-recovery'
  | 'account-sync'
  | 'account-delete';

type AppPage = LevelId | 'home' | 'settings' | AccountPageId | 'a1-test' | 'a2-test' | 'neural';
type NeuralHistoryState = { neuralReturnUrl?: string };

const neuralReturnStorageKey = 'spanish-neural-return-url';

function getHashRoute() {
  const rawHash = window.location.hash.replace(/^#\/?/, '');
  const [pathPart = '', queryPart = ''] = rawHash.split('?');
  const parts = pathPart.split('/').filter(Boolean).map((part) => part.toLowerCase());
  const search = new URLSearchParams(queryPart);
  return { parts, search };
}

function getInitialRoute(): AppPage {
  const { parts } = getHashRoute();
  if ((parts[0] === 'a1' || parts[0] === 'a2') && parts[1] === 'test') return `${parts[0]}-test` as AppPage;
  if ((parts[0] === 'test' || parts[0] === 'training') && parts[1] === 'a2') return 'a2-test';
  if (parts[0] === 'test' || parts[0] === 'training') return 'a1-test';
  if (parts[0] === 'neural' && parts[1]) return 'neural';
  if (parts[0] === 'account') {
    if (parts[1] === 'login') return 'account-login';
    if (parts[1] === 'register') return 'account-register';
    if (parts[1] === 'verify-email') return 'account-verify-email';
    if (parts[1] === 'password-recovery') return 'account-password-recovery';
    if (parts[1] === 'sync') return 'account-sync';
    if (parts[1] === 'delete') return 'account-delete';
    return 'account';
  }
  if (parts[0] === 'settings') return 'settings';
  return ['a1', 'a2', 'b1', 'b2'].includes(parts[0]) ? parts[0] as LevelId : 'home';
}

function getInitialNeuralNodeId() {
  const { parts } = getHashRoute();
  return parts[0]?.toLowerCase() === 'neural' ? decodeURIComponent(parts[1] || '') : '';
}

function getInitialQuestionCount() {
  const { search } = getHashRoute();
  const count = Number(search.get('count') || 20);
  return [20, 50, 100, 200].includes(count) ? count : 20;
}

function getCurrentUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('spanish-locale') as Locale) || 'zh');
  const [page, setPage] = useState<AppPage>(getInitialRoute);
  const [neuralNodeId, setNeuralNodeId] = useState(getInitialNeuralNodeId);
  const [initialTestCount, setInitialTestCount] = useState(getInitialQuestionCount);
  const [dark, setDark] = useState(() => localStorage.getItem('spanish-theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('spanish-locale', locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('spanish-theme', dark ? 'dark' : 'light');
  }, [dark]);

  function navigate(target: LevelId | 'home' | 'settings' | AccountPageId) {
    setPage(target);
    setNeuralNodeId('');
    window.history.pushState({}, '', routeIdToHash(target));
  }

  function navigateRoute(routeId: RouteId) {
    if (isDirectAppPageRoute(routeId)) {
      navigate(routeId);
      return;
    }
    if (routeId === 'a1-test' || routeId === 'a1-test-session' || routeId === 'a1-test-result') {
      navigateTest('a1', initialTestCount, routeId);
      return;
    }
    if (routeId === 'a2-test' || routeId === 'a2-test-session' || routeId === 'a2-test-result') {
      navigateTest('a2', initialTestCount, routeId);
    }
  }

  function navigateTest(level: 'a1' | 'a2', count: number, routeId?: Extract<RouteId, 'a1-test' | 'a1-test-session' | 'a1-test-result' | 'a2-test' | 'a2-test-session' | 'a2-test-result'>) {
    setInitialTestCount(count);
    setPage(`${level}-test`);
    setNeuralNodeId('');
    const targetRouteId = routeId || (level === 'a1' ? 'a1-test' : 'a2-test');
    window.history.pushState({}, '', routeIdToHash(targetRouteId, `count=${count}`));
  }

  function navigateNeural(nodeId: string) {
    const currentReturnUrl = (window.history.state as NeuralHistoryState | null)?.neuralReturnUrl;
    const neuralReturnUrl = currentReturnUrl || sessionStorage.getItem(neuralReturnStorageKey) || getCurrentUrl();
    sessionStorage.setItem(neuralReturnStorageKey, neuralReturnUrl);
    setNeuralNodeId(nodeId);
    setPage('neural');
    window.history.pushState({ neuralReturnUrl }, '', buildHashUrl(`neural/${encodeURIComponent(nodeId)}`));
  }

  function syncRouteFromLocation() {
    setPage(getInitialRoute());
    setNeuralNodeId(getInitialNeuralNodeId());
    setInitialTestCount(getInitialQuestionCount());
  }

  function returnFromNeural() {
    const state = window.history.state as NeuralHistoryState | null;
    const storedReturnUrl = state?.neuralReturnUrl || sessionStorage.getItem(neuralReturnStorageKey);
    if (storedReturnUrl && storedReturnUrl.includes('#/')) {
      window.history.replaceState({}, '', storedReturnUrl);
      syncRouteFromLocation();
      return;
    }

    const node = findNeuralEngineNode(neuralNodeId);
    navigate(node?.level === 'A2' ? 'a2' : 'a1');
  }

  const navItems: Array<{ id: LevelId | 'home' | 'settings'; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'a1', label: 'A1' },
    { id: 'a2', label: 'A2' },
    { id: 'b1', label: 'B1' },
    { id: 'b2', label: 'B2' },
    { id: 'settings', label: '设置' },
  ];

  useEffect(() => {
    const onPop = () => syncRouteFromLocation();
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const isTestMode = page === 'a1-test' || page === 'a2-test';
  const isNeuralMode = page === 'neural';
  const isImmersiveMode = isTestMode || isNeuralMode;

  return (
    <AuthProvider>
      <NeuralProvider routeKey={`${page}:${neuralNodeId}`}>
        <div className="min-h-screen">
          {!isImmersiveMode && (
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-paper/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
                <button type="button" onClick={() => navigate('home')} className="rounded-lg text-left transition hover:scale-[1.02]">
                  <BrandLogo size="small" showText />
                </button>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <nav className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" aria-label="Main navigation">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.id)}
                        className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                          page === item.id
                            ? 'bg-coral-600 text-white'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </nav>
                  <AccountMenu onNavigateRoute={navigateRoute} locale={locale} />
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
          )}

          {page === 'home' && <Home locale={locale} onNavigate={navigate} />}
          {page === 'a1' && <LevelPage content={a1Content} locale={locale} onHome={() => navigate('home')} onNavigate={navigate} onNavigateRoute={navigateRoute} onStartVocabTest={navigateTest} />}
          {page === 'a2' && <LevelPage content={a2Content} locale={locale} onHome={() => navigate('home')} onNavigate={navigate} onNavigateRoute={navigateRoute} onStartVocabTest={navigateTest} />}
          {page === 'b1' && <LevelPage content={b1Content} locale={locale} onHome={() => navigate('home')} onNavigate={navigate} onNavigateRoute={navigateRoute} onStartVocabTest={navigateTest} />}
          {page === 'b2' && <LevelPage content={b2Content} locale={locale} onHome={() => navigate('home')} onNavigate={navigate} onNavigateRoute={navigateRoute} onStartVocabTest={navigateTest} />}
          {page === 'settings' && <SettingsPage onBackHome={() => navigate('home')} onNavigateRoute={navigateRoute} />}
          {page === 'account' && <AccountPage mode="profile" locale={locale} onBack={() => navigate('home')} onNavigateRoute={navigateRoute} />}
          {page === 'account-login' && <AccountPage mode="login" locale={locale} onBack={() => navigate('account')} onNavigateRoute={navigateRoute} />}
          {page === 'account-register' && <AccountPage mode="register" locale={locale} onBack={() => navigate('account')} onNavigateRoute={navigateRoute} />}
          {page === 'account-verify-email' && <AccountPage mode="verify-email" locale={locale} onBack={() => navigate('account')} onNavigateRoute={navigateRoute} />}
          {page === 'account-password-recovery' && <AccountPage mode="password-recovery" locale={locale} onBack={() => navigate('account')} onNavigateRoute={navigateRoute} />}
          {page === 'account-sync' && <AccountPage mode="sync" locale={locale} onBack={() => navigate('account')} onNavigateRoute={navigateRoute} />}
          {page === 'account-delete' && <AccountPage mode="delete" locale={locale} onBack={() => navigate('account')} onNavigateRoute={navigateRoute} />}
          {page === 'neural' && (
            <NeuralWorkspacePage
              nodeId={neuralNodeId}
              onBack={returnFromNeural}
              onOpenNode={navigateNeural}
              onNavigateRoute={navigateRoute}
            />
          )}
          {page === 'a1-test' && (
            <VocabularyTestPage
              level="A1"
              words={a1VocabularyItems}
              initialQuestionCount={initialTestCount}
              onExit={() => navigate('a1')}
              onNavigateRoute={navigateRoute}
              onRouteChange={(routeId, count = initialTestCount) => navigateTest('a1', count, routeId as Extract<RouteId, 'a1-test' | 'a1-test-session' | 'a1-test-result'>)}
            />
          )}
          {page === 'a2-test' && (
            <VocabularyTestPage
              level="A2"
              words={a2VocabularyItems}
              initialQuestionCount={initialTestCount}
              onExit={() => navigate('a2')}
              onNavigateRoute={navigateRoute}
              onRouteChange={(routeId, count = initialTestCount) => navigateTest('a2', count, routeId as Extract<RouteId, 'a2-test' | 'a2-test-session' | 'a2-test-result'>)}
            />
          )}
          {!isImmersiveMode && <Footer />}
          {!isImmersiveMode && <BackToTopButton />}
        </div>
      </NeuralProvider>
    </AuthProvider>
  );
}

function isDirectAppPageRoute(routeId: RouteId): routeId is LevelId | 'home' | 'settings' | AccountPageId {
  return (
    routeId === 'home'
    || routeId === 'settings'
    || routeId === 'a1'
    || routeId === 'a2'
    || routeId === 'b1'
    || routeId === 'b2'
    || routeId === 'account'
    || routeId === 'account-login'
    || routeId === 'account-register'
    || routeId === 'account-verify-email'
    || routeId === 'account-password-recovery'
    || routeId === 'account-sync'
    || routeId === 'account-delete'
  );
}

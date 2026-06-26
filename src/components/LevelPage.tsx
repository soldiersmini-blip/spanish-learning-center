import type { LevelContent, LevelId, Locale } from '../types';
import { t } from '../i18n';
import BrandLogo from './BrandLogo';
import VocabMasteryTest from './VocabMasteryTest';
import NeuralLearningStats from './neural/NeuralLearningStats';
import { a1VocabularyItems } from '../data/vocabulary/a1';
import { a2VocabularyItems } from '../data/vocabulary/a2';
import PageHeader from './navigation/PageHeader';
import type { RouteId } from '../navigation/routes';
import LearningMap from './learning-map/LearningMap';
import { learningMapsByLevelId } from '../data/learningMap';

interface Props {
  content: LevelContent;
  locale: Locale;
  onHome: () => void;
  onNavigate: (target: LevelId) => void;
  onNavigateRoute: (routeId: RouteId) => void;
  onStartVocabTest: (level: 'a1' | 'a2', count: number) => void;
}

export default function LevelPage({ content, locale, onHome, onNavigate, onNavigateRoute, onStartVocabTest }: Props) {
  const learningMap = learningMapsByLevelId[content.id];
  const testLevelId = content.id === 'a1' || content.id === 'a2' ? content.id : null;
  const hasVocabularyTest = testLevelId !== null;
  const vocabLevel = content.id === 'a1' ? 'A1' : 'A2';
  const vocabWords = content.id === 'a1' ? a1VocabularyItems : a2VocabularyItems;

  return (
    <>
      <PageHeader
        routeId={content.id}
        title={t(content.title, locale)}
        eyebrow={content.id.toUpperCase()}
        subtitle={t(content.subtitle, locale)}
        onBack={onHome}
        onNavigateRoute={onNavigateRoute}
      />
      <main className="mx-auto w-full max-w-7xl px-5 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <BrandLogo size="medium" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-coral-600 dark:text-coral-100">{content.id.toUpperCase()}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">{t(content.title, locale)}</h1>
              <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">{t(content.subtitle, locale)}</p>
            </div>
          </div>
        </div>
        {hasVocabularyTest && (
          <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
            <VocabMasteryTest
              level={vocabLevel}
              words={vocabWords}
              onNavigate={onNavigate}
              onStartTest={(count) => {
                if (testLevelId) onStartVocabTest(testLevelId, count);
              }}
            />
            <NeuralLearningStats level={vocabLevel} />
          </div>
        )}
        <LearningMap map={learningMap} modules={content.modules} locale={locale} />
      </main>
    </>
  );
}

import { Eye, EyeOff, MapPinned } from 'lucide-react';
import type { CourseModule, Locale } from '../../types';
import type { LearningMapContent } from '../../types/learningMap';
import { t, uiText } from '../../i18n';
import { useLearningMapState } from '../../hooks/useLearningMapState';
import { getLearningMapStats, getNodeStatus } from '../../utils/learningMapTree';
import GrammarCard from '../GrammarCard';
import GrammarExplorer from '../GrammarExplorer';
import SentenceExplorer from '../SentenceExplorer';
import SkillSection from '../SkillSection';
import VocabularyExplorer from '../VocabularyExplorer';
import LearningMapEmptyState from './LearningMapEmptyState';
import LearningMapToolbar from './LearningMapToolbar';
import LearningNodeStatusButton from './LearningNodeStatusButton';
import LearningProgressBadge from './LearningProgressBadge';
import LearningTree from './LearningTree';

interface Props {
  map: LearningMapContent;
  modules?: CourseModule[];
  locale: Locale;
}

export default function LearningMap({ map, modules = [], locale }: Props) {
  const { state, selectedNode, selectedNodeId, actions } = useLearningMapState(map);
  const stats = getLearningMapStats(map.nodes, state);
  const selectedModule = modules.find((module) => module.id === selectedNode?.id);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white dark:bg-brand-100 dark:text-slate-950">
                <MapPinned className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-coral-600 dark:text-coral-100">{map.level}</p>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">{t(map.title, locale)}</h2>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{t(map.description, locale)}</p>
          </div>
          <div className="w-full max-w-xl">
            <LearningProgressBadge stats={stats} locale={locale} />
          </div>
        </div>

        <LearningMapToolbar
          locale={locale}
          hideMastered={state.hideMastered}
          showHidden={state.showHidden}
          viewMode={state.viewMode}
          filterMode={state.filterMode}
          onExpandAll={actions.expandAll}
          onCollapseAll={actions.collapseAll}
          onHideMastered={actions.setHideMastered}
          onShowHidden={actions.setShowHidden}
          onViewMode={actions.setViewMode}
          onFilterMode={actions.setFilterMode}
          onResetView={actions.resetView}
        />

        {map.nodes.length === 0 ? (
          <LearningMapEmptyState message={map.emptyMessage} locale={locale} />
        ) : (
          <div className={`grid gap-4 ${state.viewMode === 'focus' ? 'lg:grid-cols-[minmax(0,1fr)]' : 'lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.25fr)]'}`}>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <LearningTree
                nodes={map.nodes}
                locale={locale}
                state={state}
                selectedNodeId={selectedNodeId}
                onToggleExpanded={actions.toggleExpanded}
                onSelect={actions.openBranch}
                onCycleStatus={actions.cycleStatus}
                onHide={actions.hideNode}
                onRestore={actions.restoreNode}
              />
            </div>
            {state.viewMode !== 'focus' && (
              <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                {selectedNode ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-100">{selectedNode.type}</p>
                        <h3 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{t(selectedNode.title, locale)}</h3>
                        {selectedNode.description && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(selectedNode.description, locale)}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <LearningNodeStatusButton status={getNodeStatus(state, selectedNode.id)} locale={locale} onCycle={() => actions.cycleStatus(selectedNode.id)} />
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          onClick={() => state.hiddenNodeIds.includes(selectedNode.id) ? actions.restoreNode(selectedNode.id) : actions.hideNode(selectedNode.id)}
                        >
                          {state.hiddenNodeIds.includes(selectedNode.id) ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {state.hiddenNodeIds.includes(selectedNode.id)
                            ? (locale === 'zh' ? '恢复节点' : locale === 'en' ? 'Restore' : 'Restaurar')
                            : (locale === 'zh' ? '隐藏节点' : locale === 'en' ? 'Hide' : 'Ocultar')}
                        </button>
                      </div>
                    </div>
                    {selectedNode.tags && selectedNode.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedNode.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">#{tag}</span>
                        ))}
                      </div>
                    )}
                    {selectedNode.children && selectedNode.children.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedNode.children.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => actions.openBranch(child.id)}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-100 dark:hover:bg-brand-500/10"
                          >
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{t(child.title, locale)}</span>
                            {child.description && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{t(child.description, locale)}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedModule ? <ModuleLearningContent module={selectedModule} locale={locale} /> : (
                      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                        {locale === 'zh' ? '这是学习地图中的知识点。选择左侧大分支可以查看对应完整学习内容。' : locale === 'en' ? 'This is a learning-map point. Choose a main branch on the left to view full learning content.' : 'Este es un punto del mapa. Elige una rama principal para ver el contenido completo.'}
                      </div>
                    )}
                  </div>
                ) : (
                  <LearningMapEmptyState message={map.emptyMessage} locale={locale} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ModuleLearningContent({ module, locale }: { module: CourseModule; locale: Locale }) {
  return (
    <div className="space-y-5">
      {module.type === 'vocabulary' && <VocabularyExplorer categories={module.vocabCategories || []} locale={locale} />}

      {module.type === 'grammar' && module.grammarTopics && <GrammarExplorer topics={module.grammarTopics} />}

      {(module.type === 'pronunciation' || (module.type === 'grammar' && !module.grammarTopics)) && (
        <div className="grid gap-3 md:grid-cols-2">
          {(module.grammarPoints || []).map((point) => <GrammarCard key={point.title.zh} point={point} locale={locale} />)}
        </div>
      )}

      {module.type === 'sentences' && <SentenceExplorer patterns={module.sentencePatterns || []} locale={locale} />}

      {module.type === 'skills' && (
        <div className="grid gap-3 md:grid-cols-2">
          {(module.skillItems || []).map((item) => <SkillSection key={item.title.zh} item={item} locale={locale} />)}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-brand-500 bg-brand-50 p-4 dark:border-brand-100 dark:bg-slate-950">
        <p className="text-sm font-bold text-brand-700 dark:text-brand-100">{t(uiText.quiz, locale)}</p>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t(module.quiz.question, locale)}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(uiText.answer, locale)}: {t(module.quiz.answer, locale)}</p>
      </div>
    </div>
  );
}

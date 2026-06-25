import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KnowledgeTreeSection, NeuralNode, NeuralRelation } from '../../types/neuralEngine';
import { findNeuralEngineNode, getKnowledgeTree } from '../../utils/neural/neuralEngine';
import NeuralPanelHeader from './NeuralPanelHeader';
import { markNodeVisited } from './NeuralProgress';

interface Props {
  nodeId: string | null;
  onClose: () => void;
}

type NeuralStackEntry = {
  nodeId: string;
  parentLabel?: string;
  source?: 'root' | 'recommendation' | 'section';
};

export default function NeuralDrawer({ nodeId, onClose }: Props) {
  const initialNode = findNeuralEngineNode(nodeId);
  if (!nodeId) return null;

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-40 flex max-h-[82vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 md:inset-x-auto md:bottom-4 md:right-3 md:top-16 md:max-h-none md:w-[340px] md:rounded-2xl xl:bottom-5 xl:right-5 xl:top-24 xl:w-[390px] 2xl:w-[420px]"
      aria-label="Neural Link 语言知识图谱辅助栏"
    >
      {initialNode ? (
        <KnowledgeRail initialNode={initialNode} onClose={onClose} />
      ) : (
        <>
          <NeuralPanelHeader title="未找到节点" onClose={onClose} />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <p className="text-sm text-slate-500 dark:text-slate-300">这个 Neural 节点暂时不存在。</p>
          </div>
        </>
      )}
    </aside>
  );
}

function KnowledgeRail({ initialNode, onClose }: { initialNode: NeuralNode; onClose: () => void }) {
  const [stack, setStack] = useState<NeuralStackEntry[]>([{ nodeId: initialNode.id, source: 'root' }]);
  const [openSections, setOpenSections] = useState<string[]>(['usage', 'scene', 'contrast', 'grammar', 'path']);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const activeEntry = stack[stack.length - 1];
  const previousEntry = stack.length > 1 ? stack[stack.length - 2] : undefined;
  const activeNode = findNeuralEngineNode(activeEntry.nodeId) || initialNode;
  const previousNode = previousEntry ? findNeuralEngineNode(previousEntry.nodeId) : undefined;
  const tree = getKnowledgeTree(activeNode.id) || getKnowledgeTree(initialNode.id);
  const sections = useMemo(() => tree?.sections || [], [tree]);

  useEffect(() => {
    setStack([{ nodeId: initialNode.id, source: 'root' }]);
    scrollPositionsRef.current = {};
  }, [initialNode.id]);

  useEffect(() => {
    if (tree?.center) markNodeVisited(tree.center.id);
  }, [tree?.center]);

  if (!tree) {
    return (
      <>
        <NeuralPanelHeader title={activeNode.title} onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="text-sm text-slate-500 dark:text-slate-300">这个节点暂时没有知识树。</p>
        </div>
      </>
    );
  }

  function saveCurrentScroll() {
    if (!scrollerRef.current) return;
    scrollPositionsRef.current[activeEntry.nodeId] = scrollerRef.current.scrollTop;
  }

  function restoreScroll(nodeIdToRestore: string) {
    window.setTimeout(() => {
      if (!scrollerRef.current) return;
      scrollerRef.current.scrollTop = scrollPositionsRef.current[nodeIdToRestore] || 0;
    }, 0);
  }

  function openChild(targetId: string, source: NeuralStackEntry['source']) {
    if (targetId === activeEntry.nodeId) return;
    saveCurrentScroll();
    setStack((current) => [...current, { nodeId: targetId, parentLabel: tree?.center.title || activeNode.title, source }]);
    window.setTimeout(() => {
      if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    }, 0);
  }

  function goBackOneLevel() {
    if (!previousEntry) return;
    const previousId = previousEntry.nodeId;
    setStack((current) => current.slice(0, -1));
    restoreScroll(previousId);
  }

  function toggleSection(sectionId: string) {
    setOpenSections((current) => current.includes(sectionId) ? current.filter((item) => item !== sectionId) : [...current, sectionId]);
  }

  const backLabel = previousNode ? `返回 ${previousNode.title}` : undefined;

  return (
    <>
      <NeuralPanelHeader
        title={tree.center.title}
        backLabel={backLabel}
        onBack={previousEntry ? goBackOneLevel : undefined}
        onClose={onClose}
      />

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          <section className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-black text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">{tree.center.level}</span>
              {tree.center.category && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">{tree.center.category}</span>}
              {tree.center.partOfSpeech && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">{tree.center.partOfSpeech}</span>}
            </div>
            <h3 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{tree.center.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{tree.summary.coreMeaning}</p>
            <div className="mt-3 grid gap-2 text-xs">
              <Insight label="为什么学" value={tree.summary.whyLearn} />
              <Insight label="记忆钩子" value={tree.summary.memoryHint} />
            </div>
            {tree.center.example && (
              <div className="mt-3 rounded-xl bg-white p-3 text-sm dark:bg-slate-950">
                <p className="font-bold text-slate-950 dark:text-white">{tree.center.example}</p>
                {tree.center.exampleZh && <p className="mt-1 leading-6 text-slate-600 dark:text-slate-300">{tree.center.exampleZh}</p>}
              </div>
            )}
          </section>

          {tree.recommendations.length > 0 && (
            <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
              <h4 className="text-sm font-black text-slate-950 dark:text-white">智能推荐</h4>
              <div className="mt-3 grid gap-2">
                {tree.recommendations.slice(0, 3).map((item) => (
                  <RelationCard
                    key={`recommended-${item.node.id}-${item.relation.relationType}`}
                    node={item.node}
                    relation={item.relation}
                    reason={item.rankReason}
                    onSelect={(targetId) => openChild(targetId, 'recommendation')}
                    compact
                  />
                ))}
              </div>
            </section>
          )}

          {sections.map((section) => (
            <TreeSection
              key={section.id}
              section={section}
              open={openSections.includes(section.id)}
              onToggle={() => toggleSection(section.id)}
              onSelect={(targetId) => openChild(targetId, 'section')}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function TreeSection({
  section,
  open,
  onToggle,
  onSelect,
}: {
  section: KnowledgeTreeSection;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
        <span>
          <span className="block text-sm font-black text-slate-950 dark:text-white">{section.title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{section.description}</span>
        </span>
        {open ? <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="grid gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {section.relations.map((item) => (
            <RelationCard
              key={`${section.id}-${item.node.id}-${item.relation.relationType}`}
              node={item.node}
              relation={item.relation}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RelationCard({
  node,
  relation,
  reason,
  compact = false,
  onSelect,
}: {
  node: NeuralNode;
  relation: NeuralRelation;
  reason?: string;
  compact?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-brand-600 hover:bg-white dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950 dark:text-white">{node.title}</span>
          <span className="mt-0.5 block text-xs font-bold text-brand-700 dark:text-brand-100">{relation.labelZh}</span>
        </span>
        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-900 dark:text-slate-300">
          {relation.learningValue}
        </span>
      </div>
      <p className={`${compact ? 'line-clamp-2' : ''} mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300`}>
        {reason || relation.reasonZh}
      </p>
      {!compact && (
        <p className="mt-1 text-[11px] leading-4 text-slate-400 dark:text-slate-500">
          依据：{relation.evidence}
        </p>
      )}
    </button>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 dark:bg-slate-950">
      <p className="font-black text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 leading-5 text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

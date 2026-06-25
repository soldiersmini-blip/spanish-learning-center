import { useEffect, useState } from 'react';
import type { KnowledgeTreeSection, NeuralNode, NeuralRelation } from '../../types/neuralEngine';
import { getKnowledgeTree } from '../../utils/neural/neuralEngine';
import { markNodeVisited } from './NeuralProgress';

interface Props {
  nodeId: string;
  compact?: boolean;
}

export default function NeuralWorkspace({ nodeId, compact = false }: Props) {
  const [activeId, setActiveId] = useState(nodeId);
  const tree = getKnowledgeTree(activeId) || getKnowledgeTree(nodeId);

  useEffect(() => {
    setActiveId(nodeId);
  }, [nodeId]);

  useEffect(() => {
    if (tree?.center) markNodeVisited(tree.center.id);
  }, [tree?.center]);

  if (!tree) {
    return <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">这个节点暂时不存在。</div>;
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <CenterCard node={tree.center} />
        {tree.sections.slice(0, 4).map((section) => <SectionGrid key={section.id} section={section} onSelect={setActiveId} compact />)}
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.3fr_0.9fr]">
      <section className="space-y-4">
        <CenterCard node={tree.center} />
        <Panel title="为什么学" description={tree.summary.whyLearn} />
        <Panel title="记忆钩子" description={tree.summary.memoryHint} />
      </section>

      <section className="space-y-4">
        {tree.sections.filter((section) => ['usage', 'scene', 'contrast'].includes(section.id)).map((section) => (
          <SectionGrid key={section.id} section={section} onSelect={setActiveId} />
        ))}
      </section>

      <section className="space-y-4">
        {tree.recommendations.length > 0 && (
          <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">智能推荐</h3>
            <div className="mt-4 grid gap-3">
              {tree.recommendations.map((item) => (
                <RelationCard
                  key={`rec-${item.node.id}-${item.relation.relationType}`}
                  node={item.node}
                  relation={item.relation}
                  reason={item.rankReason}
                  onSelect={setActiveId}
                />
              ))}
            </div>
          </section>
        )}
        {tree.sections.filter((section) => ['grammar', 'memory', 'path', 'meaning'].includes(section.id)).map((section) => (
          <SectionGrid key={section.id} section={section} onSelect={setActiveId} compact />
        ))}
      </section>
    </div>
  );
}

function CenterCard({ node }: { node: NeuralNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-black text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">{node.level}</span>
        {node.semanticRole && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">{node.semanticRole}</span>}
      </div>
      <h2 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{node.title}</h2>
      {(node.zh || node.en) && <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">{node.zh}{node.zh && node.en ? ' · ' : ''}{node.en}</p>}
      {node.partOfSpeech && <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">词性：{node.partOfSpeech}</p>}
      {node.example && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
          <p className="font-bold text-slate-950 dark:text-white">{node.example}</p>
          {node.exampleZh && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{node.exampleZh}</p>}
        </div>
      )}
    </section>
  );
}

function SectionGrid({ section, onSelect, compact = false }: { section: KnowledgeTreeSection; onSelect: (id: string) => void; compact?: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-lg font-black text-slate-950 dark:text-white">{section.title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{section.description}</p>
      <div className={`mt-4 grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {section.relations.map((item) => (
          <RelationCard
            key={`${section.id}-${item.node.id}-${item.relation.relationType}`}
            node={item.node}
            relation={item.relation}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function RelationCard({ node, relation, reason, onSelect }: { node: NeuralNode; relation: NeuralRelation; reason?: string; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-brand-600 hover:bg-white dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <span>
          <span className="block font-black text-slate-950 dark:text-white">{node.title}</span>
          <span className="mt-1 block text-xs font-bold text-brand-700 dark:text-brand-100">{relation.labelZh}</span>
        </span>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-500 dark:bg-slate-900 dark:text-slate-300">{relation.learningValue}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{reason || relation.reasonZh}</p>
      <p className="mt-1 text-[11px] leading-4 text-slate-400 dark:text-slate-500">依据：{relation.evidence}</p>
    </button>
  );
}

function Panel({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
    </section>
  );
}

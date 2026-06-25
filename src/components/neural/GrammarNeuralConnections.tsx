import { Network } from 'lucide-react';
import type { GrammarTopic } from '../../types/grammar';
import { findNeuralEngineNode, getReverseRelatedNodes } from '../../utils/neural/neuralEngine';
import NeuralTrigger from './NeuralTrigger';

const neuralGrammarIdsByTopicId: Record<string, string[]> = {
  'a1-nouns-articles': ['a1-grammar-noun-article'],
  'a1-ser-estar-tener-hay': ['a1-grammar-ser-present', 'a1-grammar-estar-present', 'a1-grammar-tener-present'],
  'a1-regular-present': ['a1-grammar-present-regular'],
  'a1-adjective-agreement': ['a1-grammar-adjective-agreement'],
  'a1-question-words': ['a1-grammar-question-words'],
  'a2-reflexive-verbs': ['a2-grammar-reflexive-verbs'],
  'a2-object-pronouns': ['a2-grammar-object-pronouns'],
  'a2-preterito-perfecto': ['a2-grammar-preterite-perfect'],
  'a2-preterito-indefinido': ['a2-grammar-preterite-indefinido'],
  'a2-future-ir-a': ['a2-grammar-future-ir-a'],
  'a2-ser-estar-advanced': ['a2-grammar-ser-estar-advanced'],
};

interface Props {
  topic: GrammarTopic;
}

export default function GrammarNeuralConnections({ topic }: Props) {
  const grammarIds = neuralGrammarIdsByTopicId[topic.id] || [];
  const related = grammarIds.flatMap((id) => getReverseRelatedNodes(id, ['grammar_used', 'conjugation', 'prerequisite']));
  const uniqueRelated = Array.from(new Map(related.map((item) => [item.node!.id, item.node!])).values()).slice(0, 18);

  if (!grammarIds.length && uniqueRelated.length === 0) return null;

  return (
    <section className="rounded-lg border border-brand-100 bg-brand-50 p-5 dark:border-brand-700 dark:bg-slate-950">
      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
        <Network className="h-5 w-5 text-brand-600 dark:text-brand-100" />
        相关词汇网络
      </h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {grammarIds.map((id) => {
          const grammarNode = findNeuralEngineNode(id);
          return grammarNode ? <NeuralTrigger key={id} nodeId={id} source="grammar-topic" label={grammarNode.title} compact /> : null;
        })}
      </div>
      {uniqueRelated.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">点击词汇可打开神经元联络</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {uniqueRelated.map((node) => (
              <NeuralTrigger key={node.id} nodeId={node.id} source="grammar-related-word" label={node.title} compact />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

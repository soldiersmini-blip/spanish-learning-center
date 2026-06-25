import type { VocabItem } from '../../types';
import type { NeuralEngineReport, NeuralGraph } from '../../types/neuralEngine';

export function validateNeuralGraph(graph: NeuralGraph, vocabulary: VocabItem[]): NeuralEngineReport {
  const ids = new Set<string>();
  const duplicateIds = new Set<string>();
  const emptyNodes = graph.nodes.filter((node) => !node.id || !node.title || !node.type || !node.level);
  graph.nodes.forEach((node) => {
    if (ids.has(node.id)) duplicateIds.add(node.id);
    ids.add(node.id);
  });

  const duplicateRelations = graph.nodes.reduce((sum, node) => {
    const seen = new Set<string>();
    let duplicates = 0;
    node.relations.forEach((relation) => {
      const key = `${relation.targetId}:${relation.relationType}`;
      if (seen.has(key)) duplicates += 1;
      seen.add(key);
    });
    return sum + duplicates;
  }, 0);

  const brokenLinks = graph.nodes.flatMap((node) =>
    node.relations.filter((relation) => !graph.nodeById.has(relation.targetId)).map((relation) => `${node.id}->${relation.targetId}`),
  );
  const circularRelations = graph.nodes.flatMap((node) => node.relations.filter((relation) => relation.targetId === node.id));
  const weakRelations = graph.nodes.flatMap((node) =>
    node.relations.filter((relation) =>
      !relation.labelZh
      || !relation.reasonZh
      || !relation.evidence
      || relation.learningValue <= 0
      || relation.semanticScore <= 0,
    ),
  );

  const incoming = new Set<string>();
  graph.reverseRelations.forEach((items, id) => {
    if (items.length > 0) incoming.add(id);
  });

  const vocabNodes = vocabulary.filter((item) => item.id && (item.level === 'A1' || item.level === 'A2'));
  const a1 = vocabNodes.filter((item) => item.level === 'A1');
  const a2 = vocabNodes.filter((item) => item.level === 'A2');
  const wordNodes = vocabNodes.map((item) => item.id!).map((id) => graph.nodeById.get(id)).filter(Boolean);
  const lowRelationWordNodes = wordNodes.filter((node) => node && node.relations.length < 5).length;
  const orphanNodes = graph.nodes.filter((node) => node.relations.length === 0 && !incoming.has(node.id)).length;
  const relationCount = wordNodes.reduce((sum, node) => sum + (node?.relations.length || 0), 0);
  const totalRelations = graph.nodes.reduce((sum, node) => sum + node.relations.length, 0);
  const explainableRelations = graph.nodes.reduce((sum, node) =>
    sum + node.relations.filter((relation) => relation.labelZh && relation.reasonZh && relation.evidence).length, 0);

  const report = {
    a1Vocabulary: a1.length,
    a1Coverage: a1.filter((item) => item.id && graph.nodeById.has(item.id)).length,
    a2Vocabulary: a2.length,
    a2Coverage: a2.filter((item) => item.id && graph.nodeById.has(item.id)).length,
    brokenLinks: brokenLinks.length,
    duplicateIds: duplicateIds.size,
    orphanNodes,
    lowRelationWordNodes,
    averageRelationsPerWord: wordNodes.length ? Math.round((relationCount / wordNodes.length) * 10) / 10 : 0,
    totalRelations,
    explainableRelations,
    weakRelations: weakRelations.length,
    circularRelations: circularRelations.length,
    emptyNodes: emptyNodes.length,
    duplicateRelations,
  } satisfies NeuralEngineReport;

  if (import.meta.env.DEV) {
    console.info('Neural Engine Report', report);
  }

  return report;
}

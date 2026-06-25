import { a1VocabularyItems } from '../../data/vocabulary/a1';
import { a2VocabularyItems } from '../../data/vocabulary/a2';
import type { KnowledgeTree, NeuralGraph, NeuralNode, NeuralRelation, NeuralRelationType } from '../../types/neuralEngine';
import { buildAutoNeuralNodes } from './buildAutoRelations';
import { validateNeuralGraph } from './validateNeuralGraph';

const allVocabulary = [...a1VocabularyItems, ...a2VocabularyItems];
const nodes = buildAutoNeuralNodes(allVocabulary);

const graph = buildGraph(nodes);
const report = validateNeuralGraph(graph, allVocabulary);

export function getNeuralGraph() {
  return graph;
}

export function getNeuralEngineReport() {
  return report;
}

export function getAllVocabularyForNeuralEngine() {
  return allVocabulary;
}

export function findNeuralEngineNode(nodeId?: string | null) {
  if (!nodeId) return undefined;
  return graph.nodeById.get(nodeId);
}

export function findNeuralNodeBySpanish(spanish: string) {
  const normalized = normalize(spanish);
  return graph.nodes.find((node) => node.spanish && normalize(node.spanish) === normalized);
}

export function getRelatedNodes(nodeId: string, relationTypes?: NeuralRelationType[]) {
  const node = findNeuralEngineNode(nodeId);
  if (!node) return [];
  return node.relations
    .filter((relation) => !relationTypes || relationTypes.includes(relation.relationType))
    .sort(compareRelations)
    .map((relation) => ({ relation, node: findNeuralEngineNode(relation.targetId) }))
    .filter((item) => item.node);
}

export function getReverseRelatedNodes(nodeId: string, relationTypes?: NeuralRelationType[]) {
  return (graph.reverseRelations.get(nodeId) || [])
    .filter((item) => !relationTypes || relationTypes.includes(item.relation.relationType))
    .sort((left, right) => compareRelations(left.relation, right.relation))
    .map((item) => ({ ...item, node: findNeuralEngineNode(item.sourceId) }))
    .filter((item) => item.node);
}

export function getLearningPath(nodeId: string, maxSteps = 5) {
  const path: NeuralNode[] = [];
  const visited = new Set<string>();
  let current = findNeuralEngineNode(nodeId);

  while (current && path.length < maxSteps && !visited.has(current.id)) {
    path.push(current);
    visited.add(current.id);
    const nextRelation = current.relations
      .filter((item) => !visited.has(item.targetId))
      .sort((left, right) => {
        const leftBoost = left.relationType === 'next_step' ? 12 : 0;
        const rightBoost = right.relationType === 'next_step' ? 12 : 0;
        return (right.learningValue + rightBoost) - (left.learningValue + leftBoost);
      })[0];
    current = nextRelation ? findNeuralEngineNode(nextRelation.targetId) : undefined;
  }

  return path;
}

export function getKnowledgeTree(nodeId: string): KnowledgeTree | null {
  const center = findNeuralEngineNode(nodeId);
  if (!center) return null;

  const sections = [
    section('meaning', '核心含义', '近义、反义、上位/下位概念，用来理解词义边界。', center),
    section('scene', '真实场景', '人物、地点、动作、物品和同主题词，用来迁移到对话。', center),
    section('usage', '搭配与例句', '固定搭配、共现词和例句词块，用来从认识推进到会说。', center),
    section('grammar', '语法触发', '冠词、变位、时态、代词等会影响输出的规则。', center),
    section('contrast', '易混辨析', '容易混淆或相反的词，优先建立清晰边界。', center),
    section('memory', '记忆钩子', '短提示和词块帮助长期记忆。', center),
    section('path', '下一步路径', '按学习价值推荐继续学的节点。', center),
  ].filter((item) => item.relations.length > 0);

  return {
    center,
    summary: {
      coreMeaning: center.zh || center.en || center.title,
      scene: center.category || '通用场景',
      whyLearn: whyLearn(center),
      memoryHint: center.memoryHintZh || `把 ${center.title} 放进例句和场景里记。`,
    },
    sections,
    recommendations: getSmartRecommendations(nodeId, 6),
  };
}

export function getSmartRecommendations(nodeId: string, limit = 6) {
  const center = findNeuralEngineNode(nodeId);
  if (!center) return [];

  return getRelatedNodes(nodeId)
    .filter((item): item is { relation: NeuralRelation; node: NeuralNode } => Boolean(item.node))
    .filter((item) => !['category_peer'].includes(item.relation.relationType) || item.relation.learningValue >= 70)
    .slice(0, limit)
    .map((item) => ({
      relation: item.relation,
      node: item.node,
      rankReason: rankReason(item.relation, item.node),
    }));
}

function section(id: KnowledgeTree['sections'][number]['id'], title: string, description: string, center: NeuralNode) {
  return {
    id,
    title,
    description,
    relations: getRelatedNodes(center.id)
      .filter((item): item is { relation: NeuralRelation; node: NeuralNode } => Boolean(item.node))
      .filter((item) => item.relation.group === id)
      .slice(0, id === 'scene' || id === 'usage' ? 8 : 5),
  };
}

function compareRelations(left: NeuralRelation, right: NeuralRelation) {
  return right.learningValue - left.learningValue
    || right.strength - left.strength
    || right.semanticScore - left.semanticScore
    || right.frequencyScore - left.frequencyScore;
}

function whyLearn(node: NeuralNode) {
  if (node.type === 'grammar') return '它能解释为什么句子这样组成，帮助你从背词进入造句。';
  if (node.type === 'scene') return '场景节点能把零散词汇组织成真实生活里的表达网络。';
  if (node.semanticRole === 'action') return '动词决定句子的动作，是从认识单词走向开口表达的关键。';
  if (node.semanticRole === 'place') return '地点词常用于问路、旅行、预约和日常安排。';
  if (node.semanticRole === 'object') return '名词是场景表达的核心物品或概念，常和动词、冠词一起出现。';
  return '这个节点能和场景、语法、搭配一起形成可回忆的知识块。';
}

function rankReason(relation: NeuralRelation, node: NeuralNode) {
  if (relation.relationType === 'confusable') return '易混淆，优先辨析能减少错误。';
  if (relation.relationType === 'collocation') return '固定搭配，能直接转化为可说出口的表达。';
  if (relation.group === 'grammar') return '语法触发点，能帮助你正确造句。';
  if (relation.group === 'scene') return `同属 ${node.category || '相关'} 场景，适合成组复习。`;
  return `学习价值 ${relation.learningValue}，语义相关度 ${relation.semanticScore}。`;
}

function buildGraph(inputNodes: NeuralNode[]): NeuralGraph {
  const nodeById = new Map<string, NeuralNode>();
  const reverseRelations = new Map<string, Array<{ sourceId: string; relation: NeuralNode['relations'][number] }>>();

  inputNodes.forEach((node) => nodeById.set(node.id, node));
  inputNodes.forEach((node) => {
    node.relations.forEach((relation) => {
      reverseRelations.set(relation.targetId, [...(reverseRelations.get(relation.targetId) || []), { sourceId: node.id, relation }]);
    });
  });

  return { nodes: inputNodes, nodeById, reverseRelations };
}

function normalize(value: string) {
  return value
    .replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

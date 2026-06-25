import type { VocabItem } from '../../types';
import type {
  NeuralCognitiveRole,
  NeuralDifficulty,
  NeuralLevel,
  NeuralNode,
  NeuralRelation,
  NeuralRelationGroup,
  NeuralRelationType,
} from '../../types/neuralEngine';
import { antonymPairs, commonCollocations, confusableGroups, synonymGroups } from '../../data/neural/relationDictionaries';

export const normalize = (value: string) =>
  value
    .replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();

const slug = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

type RelationInput = {
  targetId: string;
  relationType: NeuralRelationType;
  labelZh: string;
  reasonZh: string;
  strength?: 1 | 2 | 3 | 4 | 5;
  learningValue?: number;
  semanticScore?: number;
  frequencyScore?: number;
  difficulty?: NeuralDifficulty;
  evidence?: string;
  cognitiveRole?: NeuralCognitiveRole;
  group?: NeuralRelationGroup;
};

const relationTypeDefaults: Record<NeuralRelationType, Pick<NeuralRelation, 'group' | 'cognitiveRole' | 'learningValue' | 'semanticScore' | 'frequencyScore' | 'difficulty'>> = {
  synonym: { group: 'meaning', cognitiveRole: 'understand', learningValue: 92, semanticScore: 95, frequencyScore: 78, difficulty: 'easy' },
  near_synonym: { group: 'meaning', cognitiveRole: 'distinguish', learningValue: 88, semanticScore: 88, frequencyScore: 76, difficulty: 'medium' },
  antonym: { group: 'contrast', cognitiveRole: 'distinguish', learningValue: 84, semanticScore: 85, frequencyScore: 70, difficulty: 'easy' },
  hypernym: { group: 'meaning', cognitiveRole: 'understand', learningValue: 76, semanticScore: 78, frequencyScore: 65, difficulty: 'medium' },
  hyponym: { group: 'meaning', cognitiveRole: 'transfer', learningValue: 74, semanticScore: 76, frequencyScore: 62, difficulty: 'medium' },
  meronym: { group: 'scene', cognitiveRole: 'understand', learningValue: 70, semanticScore: 70, frequencyScore: 60, difficulty: 'medium' },
  holonym: { group: 'scene', cognitiveRole: 'transfer', learningValue: 70, semanticScore: 70, frequencyScore: 60, difficulty: 'medium' },
  same_scene: { group: 'scene', cognitiveRole: 'transfer', learningValue: 80, semanticScore: 78, frequencyScore: 72, difficulty: 'easy' },
  location: { group: 'scene', cognitiveRole: 'transfer', learningValue: 78, semanticScore: 78, frequencyScore: 68, difficulty: 'easy' },
  action: { group: 'scene', cognitiveRole: 'produce', learningValue: 82, semanticScore: 82, frequencyScore: 75, difficulty: 'easy' },
  object: { group: 'scene', cognitiveRole: 'produce', learningValue: 78, semanticScore: 76, frequencyScore: 70, difficulty: 'easy' },
  collocation: { group: 'usage', cognitiveRole: 'produce', learningValue: 96, semanticScore: 90, frequencyScore: 84, difficulty: 'medium' },
  co_occurrence: { group: 'usage', cognitiveRole: 'recall', learningValue: 74, semanticScore: 72, frequencyScore: 68, difficulty: 'easy' },
  example_usage: { group: 'usage', cognitiveRole: 'recall', learningValue: 82, semanticScore: 78, frequencyScore: 70, difficulty: 'easy' },
  grammar_used: { group: 'grammar', cognitiveRole: 'produce', learningValue: 90, semanticScore: 82, frequencyScore: 80, difficulty: 'medium' },
  conjugation: { group: 'grammar', cognitiveRole: 'produce', learningValue: 86, semanticScore: 82, frequencyScore: 78, difficulty: 'medium' },
  derivation: { group: 'memory', cognitiveRole: 'recall', learningValue: 72, semanticScore: 72, frequencyScore: 58, difficulty: 'medium' },
  topic: { group: 'scene', cognitiveRole: 'transfer', learningValue: 76, semanticScore: 76, frequencyScore: 66, difficulty: 'easy' },
  cause_effect: { group: 'meaning', cognitiveRole: 'understand', learningValue: 72, semanticScore: 72, frequencyScore: 55, difficulty: 'medium' },
  prerequisite: { group: 'path', cognitiveRole: 'review', learningValue: 78, semanticScore: 72, frequencyScore: 62, difficulty: 'easy' },
  next_step: { group: 'path', cognitiveRole: 'transfer', learningValue: 74, semanticScore: 70, frequencyScore: 60, difficulty: 'easy' },
  confusable: { group: 'contrast', cognitiveRole: 'distinguish', learningValue: 98, semanticScore: 90, frequencyScore: 82, difficulty: 'hard' },
  category_peer: { group: 'scene', cognitiveRole: 'review', learningValue: 66, semanticScore: 68, frequencyScore: 58, difficulty: 'easy' },
  memory_hook: { group: 'memory', cognitiveRole: 'recall', learningValue: 78, semanticScore: 65, frequencyScore: 50, difficulty: 'easy' },
};

const grammarNodeData = [
  ['a1-grammar-noun-article', 'A1', '名词与冠词', '名词的阴阳性、单复数，以及 el/la/un/una 等冠词。'],
  ['a1-grammar-adjective-agreement', 'A1', '形容词性数配合', '形容词要和名词在性、数上配合，是描述人物和物品的基础。'],
  ['a1-grammar-present-regular', 'A1', '规则动词现在时', '-ar/-er/-ir 现在时变位，支撑日常动作表达。'],
  ['a1-grammar-ser-present', 'A1', 'ser 现在时', '表达身份、职业、国籍、时间和稳定特征。'],
  ['a1-grammar-estar-present', 'A1', 'estar 现在时', '表达位置、状态和临时情况。'],
  ['a1-grammar-tener-present', 'A1', 'tener 现在时', '表达拥有、年龄、需要和部分身体感受。'],
  ['a1-grammar-question-words', 'A1', '基础疑问词', 'qué, quién, dónde, cuándo, cómo 等问题结构。'],
  ['a2-grammar-reflexive-verbs', 'A2', '反身动词', 'levantarse, ducharse, acostarse 等日常反身动作。'],
  ['a2-grammar-object-pronouns', 'A2', '宾语代词', 'lo, la, los, las 与 me, te, le 等代词替换。'],
  ['a2-grammar-preterite-perfect', 'A2', '现在完成时', '描述和现在有关的经历或刚发生的事情。'],
  ['a2-grammar-preterite-indefinido', 'A2', '简单过去时', '描述过去某个时间点已经完成的动作。'],
  ['a2-grammar-future-ir-a', 'A2', 'ir a + infinitivo', '表达近期计划和将来安排。'],
  ['a2-grammar-ser-estar-advanced', 'A2', 'ser / estar 进阶', '区分身份、本质、状态、结果和临时变化。'],
] as const;

export function buildAutoNeuralNodes(vocabItems: VocabItem[]) {
  const words = vocabItems.filter((item): item is Required<Pick<VocabItem, 'id'>> & VocabItem => Boolean(item.id && item.level && item.spanish));
  const nodes = new Map<string, NeuralNode>();
  const wordByNorm = new Map<string, VocabItem>();
  const wordsByCategory = new Map<string, VocabItem[]>();
  const wordsByLevel = new Map<string, VocabItem[]>();

  words.forEach((word) => {
    wordByNorm.set(normalize(word.spanish), word);
    append(wordsByCategory, `${word.level}:${word.category || '未分类'}`, word);
    append(wordsByLevel, word.level || 'A1', word);
  });

  words.forEach((word, index) => {
    nodes.set(word.id, {
      id: word.id,
      type: isPhrase(word) ? 'phrase' : 'word',
      level: word.level as NeuralLevel,
      title: word.spanish,
      spanish: word.spanish,
      zh: word.zh,
      en: word.en,
      category: word.category,
      partOfSpeech: word.partOfSpeech,
      example: word.example,
      exampleZh: word.exampleZh,
      semanticRole: inferSemanticRole(word),
      frequencyRank: inferFrequencyRank(word, index),
      difficulty: inferDifficulty(word),
      memoryHintZh: buildMemoryHint(word),
      usageNoteZh: buildUsageNote(word),
      commonMistakesZh: buildCommonMistakes(word),
      tags: [word.level || '', word.category || '', word.partOfSpeech || '', inferSemanticRole(word)].filter(Boolean),
      relations: [],
    });
  });

  addSceneNodes(nodes, wordsByCategory);
  addGrammarNodes(nodes);
  addDictionaryNodes(nodes, wordByNorm);
  addCoreWordRelations(nodes, words, wordByNorm, wordsByCategory, wordsByLevel);
  addGrammarBackboneRelations(nodes, words);
  ensureMinimumUsefulRelations(nodes);
  sortRelations(nodes);

  return Array.from(nodes.values());
}

function addSceneNodes(nodes: Map<string, NeuralNode>, wordsByCategory: Map<string, VocabItem[]>) {
  for (const [key, group] of wordsByCategory.entries()) {
    const [level, category] = key.split(':');
    const id = sceneId(level as NeuralLevel, category);
    const title = `${category}场景`;
    nodes.set(id, {
      id,
      type: 'scene',
      level: level as NeuralLevel,
      title,
      zh: `${category}相关生活场景`,
      category,
      semanticRole: 'scene',
      difficulty: 'easy',
      memoryHintZh: `把同一场景的词一起学，更容易在真实对话里调取。`,
      usageNoteZh: `适合按“人物-动作-物品-地点”一起复习。`,
      commonMistakesZh: [],
      tags: [level, category, 'scene'],
      relations: topByFrequency(group, 12).map((word) => makeRelation({
        targetId: word.id!,
        relationType: relationTypeForScene(word),
        labelZh: sceneLabelFor(word),
        reasonZh: `${word.spanish} 是“${category}”场景里的高频可用词，和同场景词一起学能提升整句表达速度。`,
        strength: 3,
        evidence: `分类：${category}`,
      })),
    });
  }
}

function addGrammarNodes(nodes: Map<string, NeuralNode>) {
  grammarNodeData.forEach(([id, level, title, zh]) => {
    nodes.set(id, {
      id,
      type: 'grammar',
      level: level as NeuralLevel,
      title,
      zh,
      semanticRole: 'grammar',
      difficulty: level === 'A1' ? 'easy' : 'medium',
      memoryHintZh: '语法节点负责把词从“认识”推进到“能说出来”。',
      usageNoteZh: zh,
      commonMistakesZh: [],
      tags: [level, 'grammar'],
      relations: [],
    });
  });
}

function addDictionaryNodes(nodes: Map<string, NeuralNode>, wordByNorm: Map<string, VocabItem>) {
  const externalWords = new Set<string>();
  [...synonymGroups.flatMap((group) => group.words), ...antonymPairs.flatMap((pair) => [pair[0], pair[1]]), ...confusableGroups.flatMap((group) => group.words)]
    .forEach((word) => {
      if (!wordByNorm.has(normalize(word))) externalWords.add(word);
    });

  externalWords.forEach((word) => {
    const id = `dict-word-${slug(word)}`;
    nodes.set(id, {
      id,
      type: 'word',
      level: 'A2',
      title: word,
      spanish: word,
      zh: '扩展关联词',
      semanticRole: 'extended-word',
      difficulty: 'medium',
      memoryHintZh: '这是为了辨析或搭配补充的扩展词，不计入主词库掌握量。',
      usageNoteZh: '用于帮助理解当前词和相邻概念的边界。',
      commonMistakesZh: [],
      tags: ['dictionary', 'related-word'],
      relations: [],
    });
  });
}

function addCoreWordRelations(
  nodes: Map<string, NeuralNode>,
  words: VocabItem[],
  wordByNorm: Map<string, VocabItem>,
  wordsByCategory: Map<string, VocabItem[]>,
  wordsByLevel: Map<string, VocabItem[]>,
) {
  words.forEach((word) => {
    const node = nodes.get(word.id!);
    if (!node) return;

    addSceneRelation(node, word);
    addGrammarRelation(node, word);
    addCollocationRelations(node, word, nodes);
    addDictionaryRelations(node, word, wordByNorm, nodes);
    addExampleRelations(node, word, words);
    addCategoryKnowledgeRelations(node, word, wordsByCategory);
    addLearningPathRelation(node, word, wordsByCategory, wordsByLevel);
    addMemoryHookRelation(node, word, nodes);
  });
}

function addSceneRelation(node: NeuralNode, word: VocabItem) {
  pushRelation(node, {
    targetId: sceneId(word.level as NeuralLevel, word.category || '未分类'),
    relationType: relationTypeForScene(word),
    labelZh: sceneLabelFor(word),
    reasonZh: `“${word.spanish}”常用于“${word.category || '未分类'}”场景。先把场景激活，再记单词，更接近真实表达。`,
    strength: 4,
    evidence: `词库分类：${word.category || '未分类'}`,
  });
}

function addGrammarRelation(node: NeuralNode, word: VocabItem) {
  const grammarTarget = grammarForWord(word);
  if (!grammarTarget) return;
  pushRelation(node, {
    targetId: grammarTarget,
    relationType: relationTypeForGrammar(word),
    labelZh: grammarLabelFor(word),
    reasonZh: grammarReason(word),
    strength: 4,
    evidence: `词性：${word.partOfSpeech || '未标注'}；等级：${word.level}`,
  });
}

function addCollocationRelations(node: NeuralNode, word: VocabItem, nodes: Map<string, NeuralNode>) {
  const collocations = [...(word.commonCollocations || []), ...(commonCollocations[normalize(word.spanish)] || [])]
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);

  collocations.slice(0, 4).forEach((item) => {
    const phraseId = ensurePhraseNode(nodes, item, word);
    pushRelation(node, {
      targetId: phraseId,
      relationType: 'collocation',
      labelZh: '固定搭配',
      reasonZh: `${item} 是围绕“${word.spanish}”的自然搭配。记搭配比孤立记词更容易说出完整句子。`,
      strength: 5,
      evidence: `搭配词典 / 词条 commonCollocations`,
    });
  });
}

function addExampleRelations(node: NeuralNode, word: VocabItem, words: VocabItem[]) {
  findExampleWords(word, words).slice(0, 3).forEach((target) => {
    pushRelation(node, {
      targetId: target.id!,
      relationType: 'co_occurrence',
      labelZh: '例句共现',
      reasonZh: `“${target.spanish}”和“${word.spanish}”出现在同一语境中，适合一起组成短句记忆。`,
      strength: 4,
      evidence: word.example || '同一例句语境',
    });
  });
}

function addCategoryKnowledgeRelations(node: NeuralNode, word: VocabItem, wordsByCategory: Map<string, VocabItem[]>) {
  const categoryPeers = (wordsByCategory.get(`${word.level}:${word.category || '未分类'}`) || [])
    .filter((peer) => peer.id !== word.id);

  const sameRolePeers = categoryPeers.filter((peer) => inferSemanticRole(peer) === inferSemanticRole(word));
  topByFrequency(sameRolePeers.length ? sameRolePeers : categoryPeers, 4).forEach((peer) => {
    pushRelation(node, {
      targetId: peer.id!,
      relationType: peerRelationType(word, peer),
      labelZh: peerLabelFor(word, peer),
      reasonZh: `同属“${word.category || '未分类'}”，且都属于“${inferSemanticRoleZh(word)}”附近的表达。一起学能形成可迁移的场景词块。`,
      strength: sameRolePeers.includes(peer) ? 4 : 3,
      evidence: `同场景：${word.category || '未分类'}；语义角色：${inferSemanticRole(word)}`,
    });
  });
}

function addLearningPathRelation(node: NeuralNode, word: VocabItem, wordsByCategory: Map<string, VocabItem[]>, wordsByLevel: Map<string, VocabItem[]>) {
  const categoryPeers = (wordsByCategory.get(`${word.level}:${word.category || '未分类'}`) || [])
    .filter((peer) => peer.id !== word.id);
  const candidate = topByLearningValue(categoryPeers, word)[0]
    || topByLearningValue(wordsByLevel.get(word.level || 'A1') || [], word)[0];

  if (!candidate?.id) return;
  pushRelation(node, {
    targetId: candidate.id,
    relationType: 'next_step',
    labelZh: '推荐下一步',
    reasonZh: `学完“${word.spanish}”后，继续看“${candidate.spanish}”可以扩展同一场景的表达能力。`,
    strength: 3,
    evidence: `学习价值排序：场景相关 + 高频 + 难度相近`,
  });
}

function addMemoryHookRelation(node: NeuralNode, word: VocabItem, nodes: Map<string, NeuralNode>) {
  const hookId = `memory-${word.id}`;
  if (!nodes.has(hookId)) {
    nodes.set(hookId, {
      id: hookId,
      type: 'topic',
      level: word.level as NeuralLevel,
      title: `${word.spanish} 记忆提示`,
      zh: buildMemoryHint(word),
      category: word.category,
      semanticRole: 'memory-hook',
      difficulty: 'easy',
      memoryHintZh: buildMemoryHint(word),
      usageNoteZh: '记忆提示用于把词义、场景和例句绑定到一起。',
      commonMistakesZh: [],
      tags: [word.level || '', 'memory-hook'],
      relations: [makeRelation({
        targetId: word.id!,
        relationType: 'memory_hook',
        labelZh: '回到核心词',
        reasonZh: `这个提示服务于“${word.spanish}”的长期记忆。`,
        strength: 2,
        evidence: '自动生成记忆提示',
      })],
    });
  }

  pushRelation(node, {
    targetId: hookId,
    relationType: 'memory_hook',
    labelZh: '记忆提示',
    reasonZh: `把“${word.spanish}”和场景、例句、词性绑定，降低孤立背词的负担。`,
    strength: 3,
    evidence: '词条字段：词义、分类、例句',
  });
}

function addDictionaryRelations(node: NeuralNode, word: VocabItem, wordByNorm: Map<string, VocabItem>, nodes: Map<string, NeuralNode>) {
  const normalized = normalize(word.spanish);
  synonymGroups.forEach((group) => {
    if (!group.words.map(normalize).includes(normalized)) return;
    group.words.filter((item) => normalize(item) !== normalized).forEach((item) => {
      const target = findWordOrDictionaryNode(item, wordByNorm, nodes);
      if (target) pushRelation(node, {
        targetId: target,
        relationType: 'near_synonym',
        labelZh: '近义辨析',
        reasonZh: group.explanationZh,
        strength: 4,
        evidence: `近义组：${group.groupId}`,
      });
    });
  });

  antonymPairs.forEach(([left, right, explanation]) => {
    if (normalize(left) !== normalized && normalize(right) !== normalized) return;
    const other = normalize(left) === normalized ? right : left;
    const target = findWordOrDictionaryNode(other, wordByNorm, nodes);
    if (target) pushRelation(node, {
      targetId: target,
      relationType: 'antonym',
      labelZh: '反义对照',
      reasonZh: explanation,
      strength: 4,
      evidence: `${left} ↔ ${right}`,
    });
  });

  confusableGroups.forEach((group) => {
    if (!group.words.map(normalize).includes(normalized)) return;
    group.words.filter((item) => normalize(item) !== normalized).forEach((item) => {
      const target = findWordOrDictionaryNode(item, wordByNorm, nodes);
      if (target) pushRelation(node, {
        targetId: target,
        relationType: 'confusable',
        labelZh: '易混辨析',
        reasonZh: group.explanationZh,
        strength: 5,
        evidence: `易混组：${group.words.join(' / ')}`,
      });
    });
  });
}

function addGrammarBackboneRelations(nodes: Map<string, NeuralNode>, words: VocabItem[]) {
  const find = (...terms: string[]) => words.filter((word) => terms.some((term) => normalize(word.spanish).includes(normalize(term)))).slice(0, 8);
  const byCategory = (fragment: string) => words.filter((word) => (word.category || '').includes(fragment)).slice(0, 10);
  const sets: Record<string, VocabItem[]> = {
    'a1-grammar-question-words': find('qué', 'dónde', 'cuándo', 'quién', 'cómo'),
    'a2-grammar-object-pronouns': find('pedir', 'dar', 'ver', 'comprar', 'enviar', 'recibir'),
    'a2-grammar-preterite-perfect': byCategory('过去').concat(find('ayer', 'anoche')),
    'a2-grammar-preterite-indefinido': byCategory('过去').concat(find('ayer', 'anoche', 'la semana pasada')),
  };

  Object.entries(sets).forEach(([grammarId, targets]) => {
    const grammarNode = nodes.get(grammarId);
    if (!grammarNode) return;
    targets.filter((word) => word.id).slice(0, 8).forEach((word) => {
      pushRelation(grammarNode, {
        targetId: word.id!,
        relationType: 'example_usage',
        labelZh: '语法例词',
        reasonZh: `“${word.spanish}”可以帮助理解“${grammarNode.title}”在真实词汇中的使用方式。`,
        strength: 3,
        evidence: `语法节点：${grammarNode.title}`,
      });
    });
  });
}

function ensureMinimumUsefulRelations(nodes: Map<string, NeuralNode>) {
  const allLearnableNodes = Array.from(nodes.values()).filter((node) => node.type === 'word' || node.type === 'phrase');
  allLearnableNodes.forEach((node, index) => {
    const peers = allLearnableNodes
      .filter((peer) => peer.id !== node.id && peer.level === node.level && peer.category === node.category)
      .sort((left, right) => (right.frequencyRank || 9999) - (left.frequencyRank || 9999));

    let cursor = 0;
    while (node.relations.length < 5 && peers[cursor]) {
      pushRelation(node, {
        targetId: peers[cursor].id,
        relationType: 'category_peer',
        labelZh: '同主题复习',
        reasonZh: `同属“${node.category || '相关主题'}”，可作为复习补位词，帮助建立场景词群。`,
        strength: 2,
        evidence: `最小联络补齐：${node.category || '未分类'}`,
      });
      cursor += 1;
    }

    if (node.relations.length < 5) {
      const target = allLearnableNodes[(index + 1) % allLearnableNodes.length];
      if (target && target.id !== node.id) pushRelation(node, {
        targetId: target.id,
        relationType: 'next_step',
        labelZh: '补充学习路径',
        reasonZh: '用于保证节点不孤立；优先级较低，只在缺少更强关系时出现。',
        strength: 2,
        evidence: '最小联络补齐',
      });
    }
  });
}

function sortRelations(nodes: Map<string, NeuralNode>) {
  nodes.forEach((node) => {
    node.relations.sort((left, right) =>
      right.learningValue - left.learningValue
      || right.strength - left.strength
      || right.semanticScore - left.semanticScore
      || right.frequencyScore - left.frequencyScore,
    );
  });
}

function findExampleWords(word: VocabItem, words: VocabItem[]) {
  const example = normalize(word.example || '');
  if (!example) return [];
  return words
    .filter((candidate) => candidate.id !== word.id)
    .filter((candidate) => {
      const target = normalize(candidate.spanish);
      return target.length > 2 && example.includes(target);
    })
    .slice(0, 3);
}

function grammarForWord(word: VocabItem) {
  const normalized = normalize(word.spanish);
  const pos = word.partOfSpeech || '';
  const category = word.category || '';
  if (category.includes('过去')) return 'a2-grammar-preterite-indefinido';
  if (normalized === 'ser' || normalized === 'soy') return 'a1-grammar-ser-present';
  if (normalized === 'estar' || normalized === 'estoy') return 'a1-grammar-estar-present';
  if (normalized === 'tener' || normalized === 'tengo') return 'a1-grammar-tener-present';
  if (pos.includes('反身') || /se$/.test(normalized)) return 'a2-grammar-reflexive-verbs';
  if (pos.includes('动词') || /(?:ar|er|ir)$/.test(normalized)) return word.level === 'A2' ? 'a2-grammar-future-ir-a' : 'a1-grammar-present-regular';
  if (pos.includes('形容')) return 'a1-grammar-adjective-agreement';
  if (pos.includes('名词')) return 'a1-grammar-noun-article';
  if (['que', 'qué', 'donde', 'dónde', 'cuando', 'cuándo', 'quien', 'quién', 'como', 'cómo'].some((item) => normalized.includes(normalize(item)))) return 'a1-grammar-question-words';
  return word.level === 'A2' ? 'a2-grammar-ser-estar-advanced' : 'a1-grammar-noun-article';
}

function relationTypeForGrammar(word: VocabItem): NeuralRelationType {
  const pos = word.partOfSpeech || '';
  const normalized = normalize(word.spanish);
  if (pos.includes('动词') || pos.includes('反身') || /(?:ar|er|ir|se)$/.test(normalized)) return 'conjugation';
  return 'grammar_used';
}

function grammarLabelFor(word: VocabItem) {
  const pos = word.partOfSpeech || '';
  if (pos.includes('动词') || pos.includes('反身')) return '变位/句法';
  if (pos.includes('形容')) return '性数配合';
  if (pos.includes('名词')) return '冠词规则';
  return '语法触发';
}

function grammarReason(word: VocabItem) {
  const pos = word.partOfSpeech || '';
  if (pos.includes('反身')) return `“${word.spanish}”是反身动词，学习时必须同时记住代词位置和人称变化。`;
  if (pos.includes('动词')) return `“${word.spanish}”是动词，真正会用它需要连接到变位和句型。`;
  if (pos.includes('形容')) return `“${word.spanish}”作为形容词时，要注意和名词的阴阳性、单复数配合。`;
  if (pos.includes('名词')) return `“${word.spanish}”作为名词时，要连到冠词和性数规则，避免 el/la 用错。`;
  return `“${word.spanish}”会触发当前等级的核心语法，适合边记词边建立句法意识。`;
}

function relationTypeForScene(word: VocabItem): NeuralRelationType {
  const role = inferSemanticRole(word);
  if (role === 'place') return 'location';
  if (role === 'action') return 'action';
  if (role === 'object' || role === 'person') return 'object';
  return 'same_scene';
}

function sceneLabelFor(word: VocabItem) {
  const role = inferSemanticRole(word);
  if (role === 'place') return '地点场景';
  if (role === 'action') return '场景动作';
  if (role === 'object') return '场景物品';
  if (role === 'person') return '场景人物';
  return '使用场景';
}

function peerRelationType(word: VocabItem, peer: VocabItem): NeuralRelationType {
  const role = inferSemanticRole(word);
  if (role === 'action') return 'action';
  if (role === 'place') return 'location';
  if (role === 'object' || inferSemanticRole(peer) === 'object') return 'object';
  return 'category_peer';
}

function peerLabelFor(word: VocabItem, peer: VocabItem) {
  const role = inferSemanticRole(word);
  if (role === 'action') return '同场景动作';
  if (role === 'place') return '相关地点';
  if (role === 'object' || inferSemanticRole(peer) === 'object') return '相关物品';
  return '同主题复习';
}

function inferSemanticRole(word: VocabItem) {
  const pos = word.partOfSpeech || '';
  const category = word.category || '';
  if (pos.includes('动词') || pos.includes('反身')) return 'action';
  if (pos.includes('形容')) return 'quality';
  if (pos.includes('副词')) return 'manner';
  if (pos.includes('介词') || pos.includes('连词')) return 'connector';
  if (/地点|城市|酒店|旅行|交通|公共服务|房间|家居/.test(category)) return 'place';
  if (/家庭|职业|人物|社交/.test(category)) return 'person';
  if (pos.includes('名词')) return 'object';
  if (word.spanish.split(/\s+/).length > 1) return 'expression';
  return 'concept';
}

function inferSemanticRoleZh(word: VocabItem) {
  const role = inferSemanticRole(word);
  const labels: Record<string, string> = {
    action: '动作',
    quality: '特征',
    manner: '方式',
    connector: '连接结构',
    place: '地点',
    person: '人物',
    object: '物品/概念',
    expression: '表达',
    concept: '概念',
  };
  return labels[role] || '概念';
}

function inferDifficulty(word: VocabItem): NeuralDifficulty {
  if (word.difficulty) return word.difficulty;
  if (word.level === 'A2') return 'medium';
  if ((word.spanish || '').split(/\s+/).length > 2) return 'medium';
  return 'easy';
}

function inferFrequencyRank(word: VocabItem, index: number) {
  const levelBase = word.level === 'A1' ? 1 : 900;
  const pos = word.partOfSpeech || '';
  const posBoost = pos.includes('动词') ? 0 : pos.includes('名词') ? 80 : pos.includes('形容') ? 140 : 200;
  return levelBase + posBoost + index;
}

function buildMemoryHint(word: VocabItem) {
  const scene = word.category || '当前场景';
  if (word.example) return `把“${word.spanish}”放回例句里记：${word.example}`;
  return `把“${word.spanish}”和“${scene}”场景绑定，不要孤立背词。`;
}

function buildUsageNote(word: VocabItem) {
  const pos = word.partOfSpeech ? `词性是${word.partOfSpeech}` : '先确认词性';
  return `${pos}；使用时优先想它在哪个场景出现：${word.category || '通用场景'}。`;
}

function buildCommonMistakes(word: VocabItem) {
  const mistakes: string[] = [];
  const pos = word.partOfSpeech || '';
  if (pos.includes('名词') && /^(el|la|los|las)\s/i.test(word.spanish)) mistakes.push('不要去掉冠词孤立记名词，冠词能提示阴阳性。');
  if (pos.includes('动词')) mistakes.push('不要只记中文意思，要同时记一个可直接说出口的例句。');
  if (pos.includes('形容')) mistakes.push('注意形容词可能需要随名词变阴阳性和单复数。');
  return mistakes;
}

function ensurePhraseNode(nodes: Map<string, NeuralNode>, phrase: string, source: VocabItem) {
  const id = `phrase-${slug(phrase)}`;
  if (!nodes.has(id)) {
    nodes.set(id, {
      id,
      type: 'phrase',
      level: source.level as NeuralLevel,
      title: phrase,
      spanish: phrase,
      zh: '常见搭配',
      category: source.category,
      semanticRole: 'expression',
      difficulty: 'medium',
      memoryHintZh: `把“${phrase}”当成一个整体词块记。`,
      usageNoteZh: `围绕“${source.spanish}”形成的真实表达。`,
      commonMistakesZh: [],
      tags: [source.level || '', 'collocation'],
      relations: [makeRelation({
        targetId: source.id!,
        relationType: 'collocation',
        labelZh: '核心词',
        reasonZh: `这个搭配围绕“${source.spanish}”建立。`,
        strength: 4,
        evidence: phrase,
      })],
    });
  }
  return id;
}

function findWordOrDictionaryNode(spanish: string, wordByNorm: Map<string, VocabItem>, nodes: Map<string, NeuralNode>) {
  const found = wordByNorm.get(normalize(spanish));
  if (found?.id) return found.id;
  const id = `dict-word-${slug(spanish)}`;
  return nodes.has(id) ? id : null;
}

function topByFrequency(words: VocabItem[], limit: number) {
  return words
    .slice()
    .sort((left, right) => inferFrequencyRank(left, 0) - inferFrequencyRank(right, 0))
    .slice(0, limit);
}

function topByLearningValue(words: VocabItem[], source: VocabItem) {
  return words
    .filter((word) => word.id !== source.id)
    .slice()
    .sort((left, right) => scoreWordForNextStep(right, source) - scoreWordForNextStep(left, source));
}

function scoreWordForNextStep(word: VocabItem, source: VocabItem) {
  let score = 50;
  if (word.category === source.category) score += 24;
  if (inferSemanticRole(word) !== inferSemanticRole(source)) score += 12;
  if (word.level === source.level) score += 10;
  if (inferDifficulty(word) === inferDifficulty(source)) score += 8;
  if ((word.partOfSpeech || '').includes('动词')) score += 6;
  return score;
}

function makeRelation(input: RelationInput): NeuralRelation {
  const defaults = relationTypeDefaults[input.relationType];
  const strength = input.strength || 3;
  const semanticScore = input.semanticScore ?? defaults.semanticScore;
  const frequencyScore = input.frequencyScore ?? defaults.frequencyScore;
  const difficulty = input.difficulty ?? defaults.difficulty;
  const baseValue = input.learningValue ?? defaults.learningValue;
  const difficultyPenalty = difficulty === 'hard' ? 6 : difficulty === 'medium' ? 3 : 0;

  return {
    targetId: input.targetId,
    relationType: input.relationType,
    labelZh: input.labelZh,
    reasonZh: input.reasonZh,
    strength,
    group: input.group || defaults.group,
    cognitiveRole: input.cognitiveRole || defaults.cognitiveRole,
    learningValue: Math.max(1, Math.min(100, Math.round(baseValue + strength * 2 + semanticScore * 0.05 + frequencyScore * 0.03 - difficultyPenalty))),
    semanticScore,
    frequencyScore,
    difficulty,
    evidence: input.evidence || input.reasonZh,
  };
}

function pushRelation(node: NeuralNode, input: RelationInput) {
  if (input.targetId === node.id) return;
  if (node.relations.some((item) => item.targetId === input.targetId && item.relationType === input.relationType)) return;
  node.relations.push(makeRelation(input));
}

function sceneId(level: NeuralLevel, category: string) {
  return `${level.toLowerCase()}-scene-${slug(category || 'general')}`;
}

function isPhrase(word: VocabItem) {
  const pos = word.partOfSpeech || '';
  return pos.includes('短语') || word.spanish.split(/\s+/).length > 1;
}

function append<T>(map: Map<string, T[]>, key: string, value: T) {
  map.set(key, [...(map.get(key) || []), value]);
}

export type NeuralLevel = 'A1' | 'A2' | 'B1' | 'B2';

export type NeuralNodeType =
  | 'word'
  | 'phrase'
  | 'grammar'
  | 'sentence'
  | 'scene'
  | 'topic'
  | 'quiz';

export type NeuralRelationType =
  | 'synonym'
  | 'near_synonym'
  | 'antonym'
  | 'hypernym'
  | 'hyponym'
  | 'meronym'
  | 'holonym'
  | 'same_scene'
  | 'location'
  | 'action'
  | 'object'
  | 'collocation'
  | 'co_occurrence'
  | 'example_usage'
  | 'grammar_used'
  | 'conjugation'
  | 'derivation'
  | 'topic'
  | 'cause_effect'
  | 'prerequisite'
  | 'next_step'
  | 'confusable'
  | 'category_peer'
  | 'memory_hook';

export type NeuralRelationGroup =
  | 'meaning'
  | 'scene'
  | 'usage'
  | 'grammar'
  | 'contrast'
  | 'memory'
  | 'path';

export type NeuralCognitiveRole =
  | 'understand'
  | 'distinguish'
  | 'recall'
  | 'produce'
  | 'transfer'
  | 'review';

export type NeuralDifficulty = 'easy' | 'medium' | 'hard';

export type NeuralRelation = {
  targetId: string;
  relationType: NeuralRelationType;
  labelZh: string;
  reasonZh: string;
  strength: 1 | 2 | 3 | 4 | 5;
  group: NeuralRelationGroup;
  cognitiveRole: NeuralCognitiveRole;
  learningValue: number;
  semanticScore: number;
  frequencyScore: number;
  difficulty: NeuralDifficulty;
  evidence: string;
};

export type NeuralNode = {
  id: string;
  type: NeuralNodeType;
  level: NeuralLevel;
  title: string;
  spanish?: string;
  zh?: string;
  en?: string;
  category?: string;
  partOfSpeech?: string;
  example?: string;
  exampleZh?: string;
  semanticRole?: string;
  frequencyRank?: number;
  difficulty?: NeuralDifficulty;
  memoryHintZh?: string;
  usageNoteZh?: string;
  commonMistakesZh?: string[];
  tags: string[];
  relations: NeuralRelation[];
};

export type NeuralGraph = {
  nodes: NeuralNode[];
  nodeById: Map<string, NeuralNode>;
  reverseRelations: Map<string, Array<{ sourceId: string; relation: NeuralRelation }>>;
};

export type NeuralEngineReport = {
  a1Vocabulary: number;
  a1Coverage: number;
  a2Vocabulary: number;
  a2Coverage: number;
  brokenLinks: number;
  duplicateIds: number;
  orphanNodes: number;
  lowRelationWordNodes: number;
  averageRelationsPerWord: number;
  totalRelations: number;
  explainableRelations: number;
  weakRelations: number;
  circularRelations: number;
  emptyNodes: number;
  duplicateRelations: number;
};

export type KnowledgeTreeSection = {
  id: string;
  title: string;
  description: string;
  relations: Array<{ relation: NeuralRelation; node: NeuralNode }>;
};

export type KnowledgeTree = {
  center: NeuralNode;
  summary: {
    coreMeaning: string;
    scene: string;
    whyLearn: string;
    memoryHint: string;
  };
  sections: KnowledgeTreeSection[];
  recommendations: Array<{ relation: NeuralRelation; node: NeuralNode; rankReason: string }>;
};

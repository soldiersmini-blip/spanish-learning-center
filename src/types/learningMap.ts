import type { LevelId, LocalizedText } from '../types';

export type LearningLevel = 'A1' | 'A2' | 'B1' | 'B2';
export type LearningNodeStatus = 'not_started' | 'in_progress' | 'mastered';
export type LearningNodeType = 'section' | 'topic' | 'lesson' | 'exercise' | 'review';
export type LearningMapViewMode = 'standard' | 'compact' | 'focus';
export type LearningMapFilterMode = 'all' | 'not_started' | 'in_progress' | 'mastered';

export interface LearningNode {
  id: string;
  level: LearningLevel;
  title: LocalizedText;
  description?: LocalizedText;
  type: LearningNodeType;
  parentId?: string | null;
  children?: LearningNode[];
  order?: number;
  route?: string;
  tags?: string[];
  estimatedCount?: number;
  completedCount?: number;
}

export interface LearningMapContent {
  level: LearningLevel;
  levelId: LevelId;
  title: LocalizedText;
  description: LocalizedText;
  nodes: LearningNode[];
  emptyMessage?: LocalizedText;
}

export interface LearningMapViewState {
  level: LearningLevel;
  viewStateVersion?: number;
  expandedNodeIds: string[];
  hiddenNodeIds: string[];
  nodeStatusById: Record<string, LearningNodeStatus>;
  hideMastered: boolean;
  showHidden: boolean;
  viewMode: LearningMapViewMode;
  filterMode: LearningMapFilterMode;
  updatedAt: string;
}

export interface LearningMapStats {
  total: number;
  mastered: number;
  inProgress: number;
  notStarted: number;
  hidden: number;
}

import type { LevelId } from '../../types';
import type { LearningMapContent } from '../../types/learningMap';
import { a1LearningMap } from './a1LearningMap';
import { a2LearningMap } from './a2LearningMap';
import { b1LearningMap } from './b1LearningMap';
import { b2LearningMap } from './b2LearningMap';

export const learningMapsByLevelId: Record<LevelId, LearningMapContent> = {
  a1: a1LearningMap,
  a2: a2LearningMap,
  b1: b1LearningMap,
  b2: b2LearningMap,
};

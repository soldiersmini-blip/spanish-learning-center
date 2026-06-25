import type { VocabItem } from '../types';
import type { VocabTestLevel } from './vocabTest';

export type TrainingMode =
  | 'word-recognition'
  | 'sentence-fill-choice'
  | 'typing'
  | 'audio-choice'
  | 'audio-spelling'
  | 'image-choice';

export type EnabledTrainingMode = 'word-recognition' | 'sentence-fill-choice' | 'typing';

export type TrainingScope =
  | 'all'
  | 'current-category'
  | 'current-section'
  | 'favorites'
  | 'wrong'
  | 'recent'
  | 'custom';

export type TypingHintLevel = 'none' | 'zh' | 'first-letter' | 'edge-letters' | 'length';

export type TrainingQuestionCount = 20 | 50 | 100 | 200;

export type TrainingSettings = {
  modes: EnabledTrainingMode[];
  questionCount: TrainingQuestionCount;
  scope: TrainingScope;
  showChineseHint: boolean;
  showExampleAfterAnswer: boolean;
  showExplanation: boolean;
  instantFeedback: boolean;
  typingHintLevel: TypingHintLevel;
};

export type TrainingQuestion = {
  id: string;
  mode: EnabledTrainingMode;
  prompt: string;
  instruction: string;
  promptLabel: string;
  answer: string;
  sourceWordId: string;
  options?: string[];
  chineseHint?: string;
  clozeText?: string;
  typingHint?: string;
};

export type TrainingAnswerResult = {
  question: TrainingQuestion;
  selectedAnswer: string | null;
  typedAnswer?: string;
  correct: boolean;
  unknown: boolean;
  accentWarning?: boolean;
};

export type TrainingSession = {
  level: VocabTestLevel;
  settings: TrainingSettings;
  words: VocabItem[];
  questions: TrainingQuestion[];
};

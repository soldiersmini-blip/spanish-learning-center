export type VocabTestLevel = 'A1' | 'A2';
export type VocabPromptType = 'spanish-to-zh' | 'zh-to-spanish' | 'example-cloze';

export type VocabTestQuestion = {
  id: string;
  prompt: string;
  promptType: VocabPromptType;
  options: string[];
  answer: string;
  sourceWordId: string;
  clozeText?: string;
};

export type VocabTestRecord = {
  id: string;
  level: VocabTestLevel;
  date: string;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  estimatedKnownWords: number;
};

export type VocabAnswerResult = {
  question: VocabTestQuestion;
  selectedAnswer: string | null;
  correct: boolean;
  unknown: boolean;
};

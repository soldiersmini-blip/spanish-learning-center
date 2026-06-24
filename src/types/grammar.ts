export type GrammarLevel = 'A1' | 'A2';

export interface GrammarExample {
  spanish: string;
  zh: string;
  en: string;
  scene: string;
}

export interface Conjugation {
  verb: string;
  tense: string;
  forms: {
    pronoun: string;
    form: string;
    example: string;
    zh: string;
    scene: string;
  }[];
}

export interface CommonMistake {
  wrong: string;
  correct: string;
  reasonZh: string;
}

export interface GrammarMiniQuiz {
  question: string;
  options: string[];
  answer: string;
  explanationZh: string;
}

export interface GrammarTopic {
  id: string;
  level: GrammarLevel;
  category: string;
  title: string;
  shortDescription: string;
  explanationZh: string;
  explanationEn?: string;
  patterns: string[];
  examples: GrammarExample[];
  conjugations?: Conjugation[];
  commonMistakes: CommonMistake[];
  miniQuiz: GrammarMiniQuiz[];
}

import type { GrammarTopic } from './types/grammar';

export type Locale = 'zh' | 'en' | 'es';
export type LevelId = 'a1' | 'a2' | 'b1' | 'b2';

export type LocalizedText = Record<Locale, string>;

export interface VocabItem {
  id?: string;
  level?: 'A1' | 'A2';
  spanish: string;
  zh: string;
  en: string;
  partOfSpeech?: string;
  example: string;
  exampleZh?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  commonCollocations?: string[];
  grammarTags?: string[];
}

export interface VocabCategory {
  title: LocalizedText;
  items: VocabItem[];
}

export interface GrammarPoint {
  title: LocalizedText;
  explanation: LocalizedText;
  examples: string[];
}

export interface SentencePattern {
  id?: string;
  theme: LocalizedText;
  spanish: string;
  zh: string;
  en: string;
  slot: string;
  scene?: string;
  slots?: string[];
}

export interface SkillItem {
  title: LocalizedText;
  content: LocalizedText;
  examples: string[];
}

export interface ModuleQuiz {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface CourseModule {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  type: 'pronunciation' | 'vocabulary' | 'grammar' | 'sentences' | 'skills';
  vocabCategories?: VocabCategory[];
  grammarPoints?: GrammarPoint[];
  grammarTopics?: GrammarTopic[];
  sentencePatterns?: SentencePattern[];
  skillItems?: SkillItem[];
  quiz: ModuleQuiz;
}

export interface LevelContent {
  id: LevelId;
  title: LocalizedText;
  subtitle: LocalizedText;
  modules: CourseModule[];
}

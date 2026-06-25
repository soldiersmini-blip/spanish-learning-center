export type VocabularyLevel = 'A1' | 'A2';

export type VocabularyItem = {
  id: string;
  level: VocabularyLevel;
  spanish: string;
  zh: string;
  en: string;
  partOfSpeech: string;
  category: string;
  example: string;
  exampleZh: string;
};

export type VocabularySource = Omit<VocabularyItem, 'id' | 'level' | 'category'>;

export type Term = [spanish: string, zh: string, en: string, partOfSpeech: string];
export type NounTerm = [spanish: string, zh: string, en: string, gender: 'm' | 'f'];
export type AdjectiveTerm = [masculine: string, feminine: string, zh: string, en: string];
export type VerbTerm = [spanish: string, zh: string, en: string];

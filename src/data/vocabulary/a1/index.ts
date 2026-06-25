import { mergeUnique, toCategories, categoryStats } from '../helpers';
import { a1VocabularySource } from './source';

const merged = mergeUnique(a1VocabularySource);

export const a1VocabularyItems = merged.items;
export const a1VocabularyCategories = toCategories(a1VocabularyItems);
export const a1VocabularyDuplicates = merged.duplicates;
export const a1VocabularyStats = categoryStats(a1VocabularyItems);
export const a1VocabularyTotal = a1VocabularyItems.length;

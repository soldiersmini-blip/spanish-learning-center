import { categoryStats, mergeUnique, toCategories } from '../helpers';
import { a2VocabularySource } from './source';

const merged = mergeUnique(a2VocabularySource);

export const a2VocabularyItems = merged.items;
export const a2VocabularyCategories = toCategories(a2VocabularyItems);
export const a2VocabularyDuplicates = merged.duplicates;
export const a2VocabularyStats = categoryStats(a2VocabularyItems);
export const a2VocabularyTotal = a2VocabularyItems.length;

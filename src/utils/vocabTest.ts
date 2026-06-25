import type { VocabItem } from '../types';
import type { VocabPromptType, VocabTestLevel, VocabTestQuestion, VocabTestRecord } from '../types/vocabTest';
import { hasBlockingVocabularyIssue } from './validateVocabulary';

const RECORD_LIMIT = 5;

export const getVocabTestStorageKey = (level: VocabTestLevel) => `spanish-vocab-test-records-${level}`;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function uniqueBySpanish(items: VocabItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || !item.spanish || !item.zh) return false;
    if (item.partOfSpeech?.includes('短语')) return false;
    if (hasBlockingVocabularyIssue(item)) return false;
    const key = item.spanish.toLocaleLowerCase('es');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeOptions(correct: string, primaryDistractors: string[], fallbackDistractors: string[]) {
  const primary = Array.from(new Set(primaryDistractors.filter((item) => item && item !== correct)));
  const fallback = Array.from(new Set(fallbackDistractors.filter((item) => item && item !== correct && !primary.includes(item))));
  return shuffle([correct, ...shuffle([...primary, ...fallback]).slice(0, 3)]);
}

function sameDistractorClass(a: VocabItem, b: VocabItem) {
  if (a.partOfSpeech === b.partOfSpeech) return true;
  const aIsPhrase = a.partOfSpeech?.includes('短语');
  const bIsPhrase = b.partOfSpeech?.includes('短语');
  if (aIsPhrase || bIsPhrase) return aIsPhrase === bIsPhrase;
  return false;
}

function getAnswerForPromptType(word: VocabItem, promptType: VocabPromptType) {
  return promptType === 'spanish-to-zh' ? word.zh : word.spanish;
}

function getClozeText(word: VocabItem) {
  if (!word.example) return null;
  const target = word.spanish.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '').trim();
  if (!target || target.split(/\s+/).length > 1) return null;

  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
  if (!pattern.test(word.example)) return null;
  return word.example.replace(pattern, '______');
}

function getPromptTypes(word: VocabItem): VocabPromptType[] {
  const types: VocabPromptType[] = ['spanish-to-zh', 'zh-to-spanish'];
  if (getClozeText(word)) types.push('example-cloze');
  return types;
}

export function generateVocabQuestions(words: VocabItem[], requestedCount: number): VocabTestQuestion[] {
  const pool = uniqueBySpanish(words);
  const selected = shuffle(pool).slice(0, Math.min(requestedCount, pool.length));

  return selected.map((word, index) => {
    const promptTypes = getPromptTypes(word);
    const promptType = shuffle(promptTypes)[0];
    const answer = getAnswerForPromptType(word, promptType);
    const clozeText = promptType === 'example-cloze' ? getClozeText(word) || undefined : undefined;
    const sameClassDistractors = pool
      .filter((item) => item.id !== word.id)
      .filter((item) => sameDistractorClass(word, item))
      .map((item) => getAnswerForPromptType(item, promptType));
    const fallbackDistractors = pool
      .filter((item) => item.id !== word.id)
      .filter((item) => !sameDistractorClass(word, item))
      .map((item) => getAnswerForPromptType(item, promptType));

    return {
      id: `${word.id}-${promptType}-${index}`,
      prompt: promptType === 'spanish-to-zh' ? word.spanish : promptType === 'zh-to-spanish' ? word.zh : clozeText || word.example,
      promptType,
      options: makeOptions(answer, sameClassDistractors, fallbackDistractors),
      answer,
      sourceWordId: word.id!,
      clozeText,
    };
  });
}

export function getVocabularyLearningInsight(word?: VocabItem) {
  if (!word) {
    return {
      why: '这道题来自当前等级词库。答题后再看例句，可以避免提前泄露答案。',
      collocations: [] as string[],
      hint: '先凭记忆选择，再用解析校正理解。',
    };
  }

  const spanish = word.spanish.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '');
  const key = spanish.toLocaleLowerCase('es');
  const special: Record<string, { why: string; collocations: string[]; hint: string }> = {
    pedir: {
      why: 'pedir 表示向别人提出请求，也常用于餐厅点餐。',
      collocations: ['pedir ayuda', 'pedir comida', 'pedir permiso', 'pedir la cuenta'],
      hint: 'pedir 是“请求别人给你东西或做某事”；preguntar 是“向别人提问题”。',
    },
    preguntar: {
      why: 'preguntar 表示提出问题、询问信息。',
      collocations: ['preguntar la hora', 'preguntar una dirección', 'preguntar al profesor'],
      hint: 'preguntar 关注“问问题”；pedir 关注“请求得到某物或服务”。',
    },
    comer: {
      why: 'comer 表示吃东西，后面通常接食物。',
      collocations: ['comer arroz', 'comer pan', 'comer con amigos'],
      hint: '不要把 comer 和语言、书本搭配；说语言用 hablar，读书用 leer。',
    },
    beber: {
      why: 'beber 表示喝，后面通常接饮料。',
      collocations: ['beber agua', 'beber café', 'beber leche'],
      hint: 'beber 接饮料；吃食物用 comer。',
    },
    vivir: {
      why: 'vivir 表示居住或生活，常和 en + 地点搭配。',
      collocations: ['vivir en Madrid', 'vivir con la familia', 'vivir cerca'],
      hint: '表达“住在某地”时，用 vivir en，不要直接接食物或物品。',
    },
  };

  if (special[key]) return special[key];

  return {
    why: `${word.spanish} 是“${word.category || '当前主题'}”中的${word.partOfSpeech || '词汇'}，核心意思是“${word.zh}”。`,
    collocations: [] as string[],
    hint: `先记住核心意思“${word.zh}”，再通过例句把它放进真实语境中。`,
  };
}

export function readVocabTestRecords(level: VocabTestLevel): VocabTestRecord[] {
  try {
    const saved = localStorage.getItem(getVocabTestStorageKey(level));
    return saved ? JSON.parse(saved) as VocabTestRecord[] : [];
  } catch {
    return [];
  }
}

export function saveVocabTestRecord(record: VocabTestRecord) {
  const current = readVocabTestRecords(record.level);
  const next = [record, ...current].slice(0, RECORD_LIMIT);
  localStorage.setItem(getVocabTestStorageKey(record.level), JSON.stringify(next));
  return next;
}

export function getBestAccuracy(records: VocabTestRecord[]) {
  return records.reduce((best, record) => Math.max(best, record.accuracy), 0);
}

export function createVocabTestRecord(level: VocabTestLevel, totalWords: number, totalQuestions: number, correctCount: number): VocabTestRecord {
  const accuracy = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);
  return {
    id: `${level}-${Date.now()}`,
    level,
    date: new Date().toISOString(),
    totalQuestions,
    correctCount,
    accuracy,
    estimatedKnownWords: Math.round(totalWords * (accuracy / 100)),
  };
}

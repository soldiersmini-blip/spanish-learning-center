import type { VocabItem } from '../types';
import type {
  EnabledTrainingMode,
  TrainingAnswerResult,
  TrainingQuestion,
  TrainingSettings,
  TypingHintLevel,
} from '../types/training';
import { DEFAULT_TRAINING_MODES } from './trainingModePreferences';
import { hasBlockingVocabularyIssue } from './validateVocabulary';

const stripArticle = (value: string) => value.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '').trim();

export const defaultTrainingSettings: TrainingSettings = {
  modes: DEFAULT_TRAINING_MODES,
  questionCount: 20,
  scope: 'all',
  showChineseHint: true,
  showExampleAfterAnswer: true,
  showExplanation: true,
  instantFeedback: true,
  typingHintLevel: 'zh',
};

export function normalizeAnswer(value: string, accentTolerant = false) {
  const trimmed = value.trim().toLocaleLowerCase('es');
  if (!accentTolerant) return trimmed;
  return trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function checkTypingAnswer(input: string, answer: string) {
  const exact = normalizeAnswer(input) === normalizeAnswer(answer);
  if (exact) return { correct: true, accentWarning: false };
  const accentTolerant = normalizeAnswer(input, true) === normalizeAnswer(answer, true);
  return { correct: accentTolerant, accentWarning: accentTolerant };
}

export function buildTrainingQuestions(words: VocabItem[], settings: TrainingSettings, wrongWordIds: string[] = []) {
  const modes = settings.modes.length > 0 ? settings.modes : defaultTrainingSettings.modes;
  const pool = getTrainingPool(words, settings, wrongWordIds, modes);
  const selected = shuffle(pool).slice(0, Math.min(settings.questionCount, pool.length));

  return selected.map((word, index) => {
    const supportedModes = modes.filter((mode) => canBuildMode(word, mode));
    const fallbackModes: EnabledTrainingMode[] = ['word-recognition'];
    const mode = shuffle(supportedModes.length ? supportedModes : fallbackModes)[0];
    return buildQuestion(word, pool, mode, index, settings);
  });
}

export function getWrongWordIds(results: TrainingAnswerResult[]) {
  return Array.from(new Set(results.filter((item) => !item.correct).map((item) => item.question.sourceWordId)));
}

function getTrainingPool(words: VocabItem[], settings: TrainingSettings, wrongWordIds: string[], modes: EnabledTrainingMode[]) {
  const seen = new Set<string>();
  const base = words.filter((word) => {
    if (!word.id || !word.spanish || !word.zh || !word.example || hasBlockingVocabularyIssue(word)) return false;
    if (isLowValueGeneratedPhrase(word)) return false;
    if (!modes.some((mode) => canBuildMode(word, mode))) return false;
    const key = word.spanish.toLocaleLowerCase('es');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (settings.scope === 'wrong' && wrongWordIds.length > 0) {
    const wrong = base.filter((word) => word.id && wrongWordIds.includes(word.id));
    return wrong.length ? wrong : base;
  }

  return base;
}

function buildQuestion(word: VocabItem, pool: VocabItem[], mode: EnabledTrainingMode, index: number, settings: TrainingSettings): TrainingQuestion {
  if (mode === 'sentence-fill-choice') return buildFillChoiceQuestion(word, pool, index, settings);
  if (mode === 'typing') return buildTypingQuestion(word, index, settings);
  return buildWordRecognitionQuestion(word, pool, index);
}

function buildWordRecognitionQuestion(word: VocabItem, pool: VocabItem[], index: number): TrainingQuestion {
  const spanishToZh = Math.random() > 0.5;
  const answer = spanishToZh ? word.zh : word.spanish;
  const options = makeOptions(answer, pool, word, spanishToZh ? 'zh' : 'spanish');

  return {
    id: `${word.id}-recognition-${index}`,
    mode: 'word-recognition',
    prompt: spanishToZh ? word.spanish : word.zh,
    instruction: spanishToZh ? '请选择正确中文意思' : '请选择正确西班牙语',
    promptLabel: spanishToZh ? '西班牙语' : '中文意思',
    answer,
    options,
    sourceWordId: word.id!,
  };
}

function buildFillChoiceQuestion(word: VocabItem, pool: VocabItem[], index: number, settings: TrainingSettings): TrainingQuestion {
  const answer = stripArticle(word.spanish);
  const clozeText = getClozeText(word) || word.example;

  return {
    id: `${word.id}-fill-choice-${index}`,
    mode: 'sentence-fill-choice',
    prompt: clozeText,
    instruction: '请选择最适合填入空格的单词',
    promptLabel: '西班牙语填空',
    answer,
    options: makeOptions(answer, pool, word, 'spanish-base'),
    sourceWordId: word.id!,
    clozeText,
    chineseHint: settings.showChineseHint ? word.exampleZh || word.zh : undefined,
  };
}

function buildTypingQuestion(word: VocabItem, index: number, settings: TrainingSettings): TrainingQuestion {
  const answer = stripArticle(word.spanish);
  const clozeText = getClozeText(word) || word.example;

  return {
    id: `${word.id}-typing-${index}`,
    mode: 'typing',
    prompt: clozeText,
    instruction: '请输入正确单词',
    promptLabel: '手动输入',
    answer,
    sourceWordId: word.id!,
    clozeText,
    chineseHint: settings.showChineseHint ? word.exampleZh || word.zh : undefined,
    typingHint: getTypingHint(answer, settings.typingHintLevel, word.zh),
  };
}

function canBuildMode(word: VocabItem, mode: EnabledTrainingMode) {
  if (mode === 'word-recognition') return true;
  return Boolean(getClozeText(word));
}

function getClozeText(word: VocabItem) {
  if (!word.example) return null;
  if (!isUsefulClozeExample(word)) return null;
  const target = stripArticle(word.spanish);
  if (!target || target.split(/\s+/).length > 1) return null;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
  if (!pattern.test(word.example)) return null;
  return word.example.replace(pattern, '______');
}

function isUsefulClozeExample(word: VocabItem) {
  const example = word.example.trim();
  const exampleZh = word.exampleZh?.trim() || '';
  const spanish = stripArticle(word.spanish);
  const partOfSpeech = word.partOfSpeech || '';
  if (!example || !exampleZh || !spanish) return false;
  if (spanish.split(/\s+/).length > 1) return false;
  if (isPhraseLike(word)) return false;
  if (isLowValueGeneratedPhrase(word)) return false;
  if (isLowValueExampleTemplate(example)) return false;
  if (/["“”]/.test(example)) return false;
  if (partOfSpeech.includes('介词') || partOfSpeech.includes('连接词') || partOfSpeech.includes('结构')) return false;
  return true;
}

function isPhraseLike(word: VocabItem) {
  const partOfSpeech = word.partOfSpeech || '';
  return partOfSpeech.includes('短语') || partOfSpeech.includes('结构') || partOfSpeech.includes('鐭') || partOfSpeech.includes('缁撴瀯');
}

function isLowValueGeneratedPhrase(word: VocabItem) {
  const spanish = word.spanish.trim();
  const example = word.example.trim();
  const partOfSpeech = word.partOfSpeech || '';
  if (partOfSpeech.includes('短语') || partOfSpeech.includes('鐭')) {
    if (example === `Busco ${spanish}.`) return true;
    if (example === `Voy a ${spanish}.`) return true;
  }
  return false;
}

function isLowValueExampleTemplate(example: string) {
  return [
    /^Uso\s+.+\s+en una frase(?: sencilla)?\.$/i,
    /^Uso\s+".+"\s+en una frase\.$/i,
    /^Veo\s+.+\.$/i,
    /^Es\s+.+\.$/i,
    /^Quiero\s+\S+\s+hoy\.$/i,
  ].some((pattern) => pattern.test(example));
}

function getTypingHint(answer: string, level: TypingHintLevel, zh: string) {
  const chars = [...answer];
  if (level === 'none') return '';
  if (level === 'zh') return `中文提示：${zh}`;
  if (level === 'length') return `长度：${chars.length} 个字母`;
  if (level === 'first-letter') return `${chars[0]} ${chars.slice(1).map(() => '_').join(' ')}`;
  if (level === 'edge-letters') return chars.length <= 2 ? answer : `${chars[0]} ${chars.slice(1, -1).map(() => '_').join(' ')} ${chars[chars.length - 1]}`;
  return '';
}

function makeOptions(correct: string, pool: VocabItem[], source: VocabItem, field: 'zh' | 'spanish' | 'spanish-base') {
  const distractors = pool
    .filter((word) => word.id !== source.id)
    .sort((a, b) => Number(b.partOfSpeech === source.partOfSpeech) - Number(a.partOfSpeech === source.partOfSpeech))
    .map((word) => field === 'zh' ? word.zh : field === 'spanish-base' ? stripArticle(word.spanish) : word.spanish)
    .filter((item) => item && item !== correct);
  return shuffle([correct, ...Array.from(new Set(distractors)).slice(0, 3)]);
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

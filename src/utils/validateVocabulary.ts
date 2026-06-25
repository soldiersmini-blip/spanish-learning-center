import type { VocabItem } from '../types';

export type VocabularyIssue = {
  id?: string;
  spanish: string;
  type: 'missing-field' | 'duplicate' | 'suspicious-example' | 'suspicious-combination' | 'example-not-linked';
  message: string;
};

const suspiciousPatterns = [
  /\bVeo\s+\w+(?:ar|er|ir|arse|erse|irse)\b/i,
  /\bcomer\s+(español|inglés|libro|agua|mensaje|correo)\b/i,
  /\bbeber\s+(libro|español|inglés|comida|tarea|mensaje)\b/i,
  /\bleer\s+(agua|café|pollo|arroz|comida)\b/i,
  /\bvivir\s+(comida|agua|libro|mensaje|correo)\b/i,
  /\bcancelar\s+(la verdad|la razón|la opinión|la información)\b/i,
  /\breservar\s+(la verdad|la razón|la opinión)\b/i,
  /\bconfirmar\s+(la verdad|la razón)\b/i,
  /\bcambiar\s+(la verdad|la realidad)\b/i,
];

const conjugationHints: Record<string, string[]> = {
  ser: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
  haber: ['hay'],
  estar: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
  tener: ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'],
  ir: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
  hacer: ['hago', 'haces', 'hace', 'hacemos', 'hacéis', 'hacen'],
  decir: ['digo', 'dices', 'dice', 'decimos', 'decís', 'dicen'],
  cerrar: ['cierro', 'cierras', 'cierra', 'cerramos', 'cierran'],
  querer: ['quiero', 'quieres', 'quiere', 'queremos', 'quieren'],
  poder: ['puedo', 'puedes', 'puede', 'podemos', 'pueden'],
  ver: ['veo', 'ves', 've', 'vemos', 'ven'],
  encontrar: ['encuentro', 'encuentras', 'encuentra', 'encontramos', 'encuentran'],
  conocer: ['conozco', 'conoces', 'conoce', 'conocemos', 'conocen'],
  saber: ['sé', 'sabes', 'sabe', 'sabemos', 'saben'],
  repetir: ['repito', 'repites', 'repite', 'repetimos', 'repiten'],
  jugar: ['juego', 'juegas', 'juega', 'jugamos', 'juegan'],
  dormir: ['duermo', 'duermes', 'duerme', 'dormimos', 'duermen'],
  almorzar: ['almuerzo', 'almuerzas', 'almuerza', 'almorzamos', 'almuerzan'],
  usar: ['uso', 'usas', 'usa', 'usamos', 'usan'],
  contar: ['cuento', 'cuentas', 'cuenta', 'contamos', 'cuentan'],
  pensar: ['pensar', 'pienso', 'piensas', 'piensa', 'pensamos', 'piensan'],
  comer: ['comer', 'como', 'comes', 'come', 'comemos', 'comen'],
  beber: ['beber', 'bebo', 'bebes', 'bebe', 'bebemos', 'beben'],
  vivir: ['vivir', 'vivo', 'vives', 'vive', 'vivimos', 'viven'],
  estudiar: ['estudiar', 'estudio', 'estudias', 'estudia', 'estudiamos', 'estudian'],
  hablar: ['hablar', 'hablo', 'hablas', 'habla', 'hablamos', 'hablan'],
  leer: ['leer', 'leo', 'lees', 'lee', 'leemos', 'leen'],
  escribir: ['escribir', 'escribo', 'escribes', 'escribe', 'escribimos', 'escriben'],
};

const articleless = (value: string) => value.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '').toLowerCase();

export function validateVocabulary(words: VocabItem[]): VocabularyIssue[] {
  const issues: VocabularyIssue[] = [];
  const seen = new Map<string, VocabItem>();

  for (const word of words) {
    const required: Array<keyof VocabItem> = ['spanish', 'zh', 'example', 'exampleZh', 'category', 'partOfSpeech'];
    for (const field of required) {
      if (!word[field]) {
        issues.push({ id: word.id, spanish: word.spanish || '(空)', type: 'missing-field', message: `缺失字段：${field}` });
      }
    }

    const duplicateKey = `${word.level || ''}:${word.spanish?.toLocaleLowerCase('es')}`;
    if (seen.has(duplicateKey)) {
      issues.push({ id: word.id, spanish: word.spanish, type: 'duplicate', message: '重复词条' });
    } else {
      seen.set(duplicateKey, word);
    }

    const text = `${word.spanish} ${word.example}`;
    if (suspiciousPatterns.some((pattern) => pattern.test(text))) {
      issues.push({ id: word.id, spanish: word.spanish, type: 'suspicious-combination', message: '疑似语义错误组合' });
    }

    if (word.example && suspiciousPatterns.some((pattern) => pattern.test(word.example))) {
      issues.push({ id: word.id, spanish: word.spanish, type: 'suspicious-example', message: '例句疑似不自然或语义错误' });
    }

    if (word.spanish && word.example && !isExampleLinked(word)) {
      issues.push({ id: word.id, spanish: word.spanish, type: 'example-not-linked', message: '例句未明显包含该词或常见变位' });
    }
  }

  return issues;
}

export function hasBlockingVocabularyIssue(word: VocabItem) {
  if (!word.id || !word.spanish || !word.zh || !word.example || !word.exampleZh || !word.category || !word.partOfSpeech) return true;
  const text = `${word.spanish} ${word.example}`;
  return suspiciousPatterns.some((pattern) => pattern.test(text));
}

export function warnVocabularyIssuesInDev(level: string, words: VocabItem[]) {
  if (!import.meta.env.DEV) return;
  const issues = validateVocabulary(words);
  if (issues.length > 0) {
    console.warn(`[${level}] vocabulary validation warnings: ${issues.length}`, issues.slice(0, 50));
  }
}

function isExampleLinked(word: VocabItem) {
  const spanish = articleless(word.spanish);
  const example = word.example.toLowerCase();
  if (example.includes(spanish)) return true;
  const firstToken = spanish.split(/\s+/)[0];
  if (firstToken.length > 3 && example.includes(firstToken)) return true;
  if (looksLikeInfinitive(firstToken)) {
    const stem = firstToken.slice(0, -2);
    if (stem.length > 2 && example.includes(stem)) return true;
  }
  return (conjugationHints[spanish] || []).some((hint) => example.includes(hint));
}

function looksLikeInfinitive(value: string) {
  return /(?:ar|er|ir)$/.test(value);
}

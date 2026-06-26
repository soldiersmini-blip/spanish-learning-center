import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const outDir = join(projectRoot, 'node_modules', '.tmp', 'training-question-quality-test');
const entryPath = join(outDir, 'entry.ts');
const bundlePath = join(outDir, 'bundle.mjs');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(
  entryPath,
  [
    "export { buildTrainingQuestions } from '../../../src/utils/TrainingEngine';",
    "export { a1VocabularyItems } from '../../../src/data/vocabulary/a1';",
    "export { a2VocabularyItems } from '../../../src/data/vocabulary/a2';",
  ].join('\n'),
  'utf8',
);

await esbuild.build({
  entryPoints: [entryPath],
  outfile: bundlePath,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});

const { buildTrainingQuestions, a1VocabularyItems, a2VocabularyItems } = await import(pathToFileURL(bundlePath).href);

const baseSettings = {
  questionCount: 100,
  scope: 'all',
  showChineseHint: true,
  showExampleAfterAnswer: true,
  showExplanation: true,
  instantFeedback: true,
  typingHintLevel: 'zh',
};

const weakPromptPatterns = [
  /Uso\s+______\s+en una frase/i,
  /Uso\s+".*______.*"\s+en una frase/i,
  /^Veo\s+______\./i,
  /^Es\s+______\./i,
  /^Quiero\s+______\s+hoy\./i,
  /^Busco\s+.*______.*\./i,
];

function assertQuestionQuality(level, words, mode) {
  const questions = buildTrainingQuestions(words, { ...baseSettings, modes: [mode] });
  assert(questions.length >= 20, `${level} ${mode} should have enough high-quality questions`);
  for (const question of questions) {
    assert.equal(question.mode, mode, `${level} should not silently fall back from ${mode}`);
    assert(question.prompt.includes('______'), `${level} ${mode} prompt must contain a real blank: ${question.prompt}`);
    assert(question.chineseHint, `${level} ${mode} should keep Chinese context for fill/typing questions`);
    for (const pattern of weakPromptPatterns) {
      assert(!pattern.test(question.prompt), `${level} ${mode} contains weak generated prompt: ${question.prompt}`);
    }
  }
}

assertQuestionQuality('A1', a1VocabularyItems, 'sentence-fill-choice');
assertQuestionQuality('A1', a1VocabularyItems, 'typing');
assertQuestionQuality('A2', a2VocabularyItems, 'sentence-fill-choice');
assertQuestionQuality('A2', a2VocabularyItems, 'typing');

console.log('training-question-quality tests passed');

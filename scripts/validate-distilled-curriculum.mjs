import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const outDir = join(projectRoot, 'node_modules', '.tmp', 'validate-distilled-curriculum');
const entryPath = join(outDir, 'entry.ts');
const bundlePath = join(outDir, 'bundle.mjs');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(
  entryPath,
  [
    "export { curriculumMatrix, distilledA1Topics } from '../../../src/data/curriculum/curriculumMatrix';",
    "export { a1LearningMap } from '../../../src/data/learningMap/a1LearningMap';",
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

const { curriculumMatrix, distilledA1Topics, a1LearningMap } = await import(pathToFileURL(bundlePath).href);

const forbiddenPatterns = [
  { pattern: /https?:\/\//i, message: 'front-end distilled data must not expose textbook links' },
  { pattern: /\.pdf\b/i, message: 'front-end distilled data must not expose PDF files' },
  { pattern: /[A-Z]:\\.*Spanish_Free_Textbooks/i, message: 'front-end distilled data must not expose local textbook paths' },
  { pattern: /第\s*\d+\s*页|page\s*\d+/i, message: 'front-end distilled data must not expose textbook page numbers' },
  { pattern: /download|下载入口|教材链接|PDF入口/i, message: 'front-end distilled data must not present downloads or textbook links' },
];

const weakExamplePatterns = [
  /^Veo\s+\w+\.$/i,
  /^Es\s+\w+\.$/i,
  /^Quiero\s+\w+\s+hoy\.$/i,
  /\bveo pedir\b/i,
];

const nodeIds = new Set(flattenNodes(a1LearningMap.nodes).map((node) => node.id));
const serialized = JSON.stringify({ curriculumMatrix, distilledA1Topics });

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(serialized), message);
}

assert(distilledA1Topics.length >= 3, 'at least three A1 distilled topic samples are required');

const exerciseIds = new Set();
const exampleSentences = new Set();

for (const topic of distilledA1Topics) {
  assert.equal(topic.level, 'A1', `${topic.id} must be A1`);
  assert(topic.titleZh, `${topic.id} missing titleZh`);
  assert(topic.learningGoalZh, `${topic.id} missing learning goal`);
  assert(topic.learningMapNodeId, `${topic.id} missing learning map node id`);
  assert(nodeIds.has(topic.learningMapNodeId), `${topic.id} learning map node does not exist: ${topic.learningMapNodeId}`);
  assert(topic.grammarPoints.length > 0, `${topic.id} missing grammar points`);
  assert(topic.vocabularyThemes.length > 0, `${topic.id} missing vocabulary themes`);
  assert(topic.sentencePatterns.length > 0, `${topic.id} missing sentence patterns`);
  assert(topic.originalExamples.length >= 3, `${topic.id} needs at least three original examples`);
  assert(topic.exercises.length >= 3, `${topic.id} needs at least three original exercises`);
  assert(topic.neuralConnectionSuggestions.length > 0, `${topic.id} missing neural connection suggestions`);

  for (const example of topic.originalExamples) {
    assert(example.spanish && example.zh && example.noteZh, `${topic.id} has an incomplete example`);
    assert(!exampleSentences.has(example.spanish), `${topic.id} duplicate example: ${example.spanish}`);
    exampleSentences.add(example.spanish);
    for (const pattern of weakExamplePatterns) {
      assert(!pattern.test(example.spanish), `${topic.id} has a weak example: ${example.spanish}`);
    }
  }

  for (const exercise of topic.exercises) {
    assert(!exerciseIds.has(exercise.id), `duplicate exercise id: ${exercise.id}`);
    exerciseIds.add(exercise.id);
    assert(exercise.mode, `${exercise.id} missing mode`);
    assert(exercise.instructionZh, `${exercise.id} missing instruction`);
    assert(exercise.prompt, `${exercise.id} missing prompt`);
    assert(exercise.answer, `${exercise.id} missing answer`);
    assert(exercise.explanationZh, `${exercise.id} missing explanation`);
    assert(exercise.neuralLinks.length > 0, `${exercise.id} missing neural links`);
    assert(!promptLeaksAnswer(exercise.prompt, exercise.answer), `${exercise.id} leaks answer in prompt`);
  }
}

for (const item of curriculumMatrix) {
  assert(item.level, `${item.id} missing level`);
  assert(item.theme, `${item.id} missing theme`);
  assert(item.communicativeGoal, `${item.id} missing communicative goal`);
  assert(item.learningMapNodeId, `${item.id} missing learning map node id`);
  assert(item.integrationStatus, `${item.id} missing integration status`);
  if (item.level === 'A1' && item.integrationStatus === 'integrated') {
    assert(nodeIds.has(item.learningMapNodeId), `${item.id} integrated A1 matrix node does not exist`);
  }
}

console.log('validate-distilled-curriculum tests passed');

function flattenNodes(nodes) {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children || [])]);
}

function promptLeaksAnswer(prompt, answer) {
  const normalizedPrompt = normalize(prompt);
  const normalizedAnswer = normalize(answer);
  if (!normalizedAnswer || normalizedAnswer.length < 3) return false;
  if (prompt.includes('______')) return false;
  return normalizedPrompt.includes(normalizedAnswer);
}

function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

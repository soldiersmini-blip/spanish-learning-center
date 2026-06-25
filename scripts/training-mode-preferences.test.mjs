import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const outDir = join(projectRoot, 'node_modules', '.tmp', 'training-mode-preferences-test');
const entryPath = join(outDir, 'entry.ts');
const bundlePath = join(outDir, 'bundle.mjs');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(
  entryPath,
  "export * from '../../../src/utils/trainingModePreferences';\n",
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

const {
  DEFAULT_TRAINING_MODES,
  TRAINING_MODE_PREFERENCES_KEY,
  readTrainingModePreferences,
  saveTrainingModePreferences,
  validateTrainingModes,
} = await import(pathToFileURL(bundlePath).href);

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  const writes = [];
  return {
    writes,
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      writes.push([key, value]);
      data.set(key, value);
    },
    snapshot() {
      return Object.fromEntries(data.entries());
    },
  };
}

{
  const storage = createStorage();
  const saved = saveTrainingModePreferences(['typing'], storage, new Date('2026-06-25T10:00:00.000Z'));
  assert.deepEqual(saved, ['typing']);
  assert.deepEqual(readTrainingModePreferences(storage), ['typing']);
}

{
  const storage = createStorage({
    [TRAINING_MODE_PREFERENCES_KEY]: JSON.stringify({
      version: 1,
      selectedModes: ['sentence-fill-choice'],
      updatedAt: '2026-06-25T10:00:00.000Z',
    }),
  });
  assert.deepEqual(readTrainingModePreferences(storage), ['sentence-fill-choice']);
}

{
  const storage = createStorage({ [TRAINING_MODE_PREFERENCES_KEY]: '{broken json' });
  assert.deepEqual(readTrainingModePreferences(storage), DEFAULT_TRAINING_MODES);
}

{
  const storage = createStorage({
    [TRAINING_MODE_PREFERENCES_KEY]: JSON.stringify({
      version: 1,
      selectedModes: ['audio-choice', 'image-choice', 'word-recognition'],
      updatedAt: '2026-06-25T10:00:00.000Z',
    }),
  });
  assert.deepEqual(readTrainingModePreferences(storage), ['word-recognition']);
  assert.deepEqual(validateTrainingModes(['audio-choice', 'image-choice']), DEFAULT_TRAINING_MODES);
}

{
  const storage = createStorage({
    'spanish-progress-a1': 'keep-me',
    'spanish-vocab-test-records-A1': '[1]',
    'spanish-neural-progress': '{"ok":true}',
  });
  saveTrainingModePreferences(['typing', 'word-recognition'], storage);
  const snapshot = storage.snapshot();
  assert.equal(snapshot['spanish-progress-a1'], 'keep-me');
  assert.equal(snapshot['spanish-vocab-test-records-A1'], '[1]');
  assert.equal(snapshot['spanish-neural-progress'], '{"ok":true}');
  assert.deepEqual(storage.writes.map(([key]) => key), [TRAINING_MODE_PREFERENCES_KEY]);
}

console.log('training-mode-preferences tests passed');

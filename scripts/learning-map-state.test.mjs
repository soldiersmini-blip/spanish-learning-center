import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'src/types/learningMap.ts',
  'src/data/learningMap/a1LearningMap.ts',
  'src/data/learningMap/a2LearningMap.ts',
  'src/data/learningMap/b1LearningMap.ts',
  'src/data/learningMap/b2LearningMap.ts',
  'src/components/learning-map/LearningMap.tsx',
  'src/hooks/useLearningMapState.ts',
  'src/utils/learningMapStorage.ts',
  'src/utils/learningMapTree.ts',
];

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} should exist`);
}

const storage = read('src/utils/learningMapStorage.ts');
assert.match(storage, /learning-map:v\$\{version\}:\$\{level\}/, 'learning map storage key should be versioned by level');
assert.match(storage, /try\s*{[\s\S]*JSON\.parse[\s\S]*}\s*catch/, 'storage reader should tolerate corrupted JSON');
assert.match(storage, /spanish-progress-\$\{levelId\}/, 'legacy module progress should be read or written for compatibility');

const levelPage = read('src/components/LevelPage.tsx');
assert.doesNotMatch(levelPage, /ModulePanel/, 'LevelPage should no longer render the old module accordion list');
assert.match(levelPage, /<LearningMap/, 'LevelPage should render the shared learning map component');

const app = read('src/App.tsx');
assert.match(app, /b1Content/, 'B1 should use the shared LevelPage path');
assert.match(app, /b2Content/, 'B2 should use the shared LevelPage path');
assert.doesNotMatch(app, /<ComingSoon/, 'B1/B2 should not bypass the shared learning map with ComingSoon');

for (const level of ['a1', 'a2', 'b1', 'b2']) {
  const file = read(`src/data/learningMap/${level}LearningMap.ts`);
  assert.match(file, new RegExp(`levelId:\\s*'${level}'`), `${level} map should declare its levelId`);
}

console.log('learning-map-state.test.mjs passed');

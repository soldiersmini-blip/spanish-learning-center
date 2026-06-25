import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const outDir = join(projectRoot, 'node_modules', '.tmp', 'navigation-rules-test');
const entryPath = join(outDir, 'entry.ts');
const bundlePath = join(outDir, 'bundle.mjs');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(entryPath, "export * from '../../../src/navigation/routes';\n", 'utf8');

await esbuild.build({
  entryPoints: [entryPath],
  outfile: bundlePath,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});

const { routeDefinitions } = await import(pathToFileURL(bundlePath).href);
const routeIds = new Set(routeDefinitions.map((route) => route.id));

assert(routeIds.has('home'), 'home route must exist');

for (const route of routeDefinitions) {
  assert(route.path.startsWith('#/'), `${route.id} must use a GitHub Pages hash route`);
  assert(!/localhost|127\.0\.0\.1|file:/i.test(route.path), `${route.id} must not point to local or external dev paths`);

  if (route.id === 'home') {
    assert.equal(route.parentRouteId, undefined, 'home must not have a parent route');
    continue;
  }

  assert(route.parentRouteId, `${route.id} must declare parentRouteId`);
  assert(routeIds.has(route.parentRouteId), `${route.id} parentRouteId must point to an existing route`);
  assert.notEqual(route.parentRouteId, route.id, `${route.id} cannot be its own parent`);
}

for (const route of routeDefinitions) {
  const seen = new Set();
  let current = route;
  while (current.parentRouteId) {
    assert(!seen.has(current.id), `${route.id} has a parent cycle`);
    seen.add(current.id);
    current = routeDefinitions.find((candidate) => candidate.id === current.parentRouteId);
    assert(current, `${route.id} has a missing parent route`);
  }
}

const filesToRequirePageHeader = [
  'src/components/LevelPage.tsx',
  'src/components/ComingSoon.tsx',
  'src/components/test/TestHeader.tsx',
  'src/pages/SettingsPage.tsx',
  'src/pages/NeuralWorkspacePage.tsx',
];

for (const file of filesToRequirePageHeader) {
  const text = readFileSync(join(projectRoot, file), 'utf8');
  assert(text.includes('PageHeader'), `${file} must render the unified PageHeader or test header wrapper`);
}

const sourceFilesToScan = [
  'src/App.tsx',
  'src/components/LevelPage.tsx',
  'src/components/ComingSoon.tsx',
  'src/components/neural/NeuralProvider.tsx',
  'src/components/navigation/PageHeader.tsx',
  'src/components/test/TestHeader.tsx',
  'src/pages/SettingsPage.tsx',
  'src/pages/NeuralWorkspacePage.tsx',
  'src/pages/VocabularyTestPage.tsx',
];

const forbiddenPatterns = [
  { pattern: /href\s*=\s*["']#["']/g, message: 'href="#" is not a valid parent return target' },
  { pattern: /navigate\s*\(\s*-1\s*\)/g, message: 'navigate(-1) cannot be the only return logic' },
  { pattern: /history\.back\s*\(/g, message: 'history.back() cannot be the main parent return logic' },
  { pattern: /location\.href\s*=/g, message: 'location.href assignment bypasses hash route metadata' },
  { pattern: /localStorage\.clear\s*\(/g, message: 'localStorage.clear() is forbidden' },
];

for (const file of sourceFilesToScan) {
  const text = readFileSync(join(projectRoot, file), 'utf8');
  for (const { pattern, message } of forbiddenPatterns) {
    assert(!pattern.test(text), `${file}: ${message}`);
  }
}

console.log('navigation-rules tests passed');

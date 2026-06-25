import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const drawer = readFileSync(join(projectRoot, 'src/components/neural/NeuralDrawer.tsx'), 'utf8');
const workspace = readFileSync(join(projectRoot, 'src/components/neural/NeuralWorkspace.tsx'), 'utf8');
const header = readFileSync(join(projectRoot, 'src/components/neural/NeuralPanelHeader.tsx'), 'utf8');

assert(drawer.includes('NeuralPanelHeader'), 'Neural drawer must use the shared NeuralPanelHeader');
assert(workspace.includes('NeuralPanelHeader'), 'Neural workspace must use the shared NeuralPanelHeader');
assert(header.includes('backLabel'), 'NeuralPanelHeader must support an explicit parent back label');
assert(header.includes('onClose'), 'NeuralPanelHeader must keep close separate from parent back');

assert(drawer.includes('setStack'), 'Neural drawer must keep an internal navigation stack');
assert(workspace.includes('setStack'), 'Neural workspace must keep an internal navigation stack');
assert(drawer.includes('scrollPositionsRef'), 'Neural drawer must preserve parent scroll positions');
assert(workspace.includes('scrollPositionsRef'), 'Neural workspace must preserve parent scroll positions');
assert(drawer.includes('返回 ${previousNode.title}'), 'Neural drawer back label must name the parent node');
assert(workspace.includes('返回 ${previousNode.title}'), 'Neural workspace back label must name the parent node');

for (const [name, text] of [['drawer', drawer], ['workspace', workspace], ['header', header]]) {
  assert(!/history\.back\s*\(/.test(text), `${name} must not use history.back() for Neural parent return`);
  assert(!/navigate\s*\(\s*-1\s*\)/.test(text), `${name} must not use navigate(-1) for Neural parent return`);
  assert(!/localStorage\.clear\s*\(/.test(text), `${name} must not clear localStorage`);
}

console.log('neural-navigation tests passed');

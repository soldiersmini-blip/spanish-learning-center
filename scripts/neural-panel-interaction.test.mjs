import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const drawer = readFileSync(join(projectRoot, 'src/components/neural/NeuralDrawer.tsx'), 'utf8');
const header = readFileSync(join(projectRoot, 'src/components/neural/NeuralPanelHeader.tsx'), 'utf8');

assert(drawer.includes('PointerEvent'), 'Neural drawer drag and resize must use Pointer Events');
assert(header.includes('onDragPointerDown'), 'Neural panel header must expose the drag handle pointer event');
assert(header.includes('data-neural-drag-handle'), 'Neural panel header must identify the drag handle');
assert(drawer.includes('data-neural-resize-handle'), 'Neural drawer must render a dedicated resize handle');
assert(drawer.includes("type: 'drag' | 'resize'"), 'Drag and resize must be separate interaction modes');
assert(drawer.includes('setPointerCapture'), 'Pointer capture should be used during drag and resize');
assert(drawer.includes("document.body.style.userSelect = 'none'"), 'Drag and resize must prevent accidental text selection');
assert(drawer.includes('shouldIgnoreDragTarget'), 'Header controls must be excluded from drag start');
assert(drawer.includes('DESKTOP_BREAKPOINT = 768'), 'Free drag and resize must be desktop-only');
assert(drawer.includes('MIN_PANEL_WIDTH = 320'), 'Minimum panel width must be guarded');
assert(drawer.includes('MIN_PANEL_HEIGHT = 360'), 'Minimum panel height must be guarded');
assert(drawer.includes('PANEL_SAFE_GAP = 12'), 'Panel must keep a viewport safety gap');
assert(drawer.includes('clampPanelRect'), 'Panel movement and size must be clamped to the viewport');
assert(!/resize\s*:\s*['"]both['"]/.test(drawer), 'Do not rely on CSS resize: both');
assert(!/localStorage\./.test(drawer), 'Neural panel drag and resize must not add localStorage persistence');
assert(!/localStorage\./.test(header), 'Neural panel header must not add localStorage persistence');
assert(!/history\.back\s*\(/.test(drawer), 'Panel interactions must not use history.back()');
assert(!/navigate\s*\(\s*-1\s*\)/.test(drawer), 'Panel interactions must not use navigate(-1)');

console.log('neural-panel-interaction tests passed');

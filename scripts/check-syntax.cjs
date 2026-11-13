'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sources = [root, path.join(root, 'lib'), path.join(root, 'ui')];
let checked = 0;
for (const dir of sources) {
  for (const item of fs.readdirSync(dir, {withFileTypes: true})) {
    if (!item.isFile() || !/\.(cjs|js)$/.test(item.name)) continue;
    const file = path.join(dir, item.name);
    try {
      new vm.Script(fs.readFileSync(file, 'utf8'), {filename: file});
    } catch (error) {
      process.stderr.write(`${path.relative(root, file)}: ${error.message}\n`);
      process.exitCode = 1;
    }
    checked++;
  }
}
console.log(`Checked ${checked} JavaScript source files.`);

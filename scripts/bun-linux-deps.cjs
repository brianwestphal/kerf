const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const scopes = [
  ['package', resolve('node_modules')],
  ['satteri', resolve('node_modules/@bruits/satteri-wasm32-wasi/node_modules')],
];

for (const [scope, nodeModules] of scopes) {
  for (const name of ['@emnapi/core', '@emnapi/wasi-threads']) {
    const path = resolve(nodeModules, name, 'package.json');
    const version = existsSync(path)
      ? JSON.parse(readFileSync(path, 'utf8')).version
      : 'absent';
    console.log(`${scope}: ${name}@${version} ${path}`);
  }
}

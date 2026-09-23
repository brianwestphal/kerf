import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const generated = [
  'ux-demo/catalog.generated.ts',
  'ai/component-catalog-v2.json',
  'ai/public-api-signatures-v1.md',
  'ai/webawesome-jsx-signatures-v1.md',
  'ai-regressions/compatibility-v3.json',
];
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const updateBundleBudget = process.argv.includes('--update-bundle-budget');
const reason = valueAfter('--reason');
if (updateBundleBudget && !reason)
  throw new Error('--update-bundle-budget requires --reason "..."');

const digest = async (path) =>
  createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
const before = new Map(
  await Promise.all(generated.map(async (path) => [path, await digest(path)])),
);

function run(label, command, extraEnv = {}) {
  console.log(`\n[ui-change] ${label}`);
  const result = spawnSync('zsh', ['-ic', command], {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
  });
  if (result.status !== 0)
    throw new Error(`${label} failed with exit ${result.status ?? 'unknown'}`);
}

run('synchronize v1/v2 catalogs', 'npm run catalog:sync');
run('build declarations and browser/CSS entries', 'npm run build');
run(
  'synchronize AI public signatures',
  'node scripts/sync-ai-public-signatures.mjs',
);
run(
  'synchronize reviewed AI compatibility digests',
  'node scripts/sync-ai-compatibility.mjs --write',
);

const changed = [];
for (const path of generated)
  if (before.get(path) !== (await digest(path))) changed.push(path);
console.log(
  `\n[ui-change] checked-in projections changed: ${changed.length ? changed.join(', ') : 'none'}`,
);

run('validate catalog and integration projections', 'npm run check:catalog');
run(
  'validate public component surfaces',
  'npm run check:component-integrations',
);
run('run unit and component-contract coverage', 'npm run test:unit');
run('run consumer bundle coverage', 'npx vitest run tests/bundle');
run('run source consumer type contracts', 'npm run test:contract-types:source');
run(
  'run Web Awesome consumer typing',
  'node node_modules/typescript7/bin/tsc -p tests/consumer-types/webawesome/tsconfig.json',
);
run('run packed type contracts', 'npm run test:contract-types:packed');
run(
  'build the production UX demo',
  'vite build --config ux-demo/vite.config.ts',
);

const budgetCommand = updateBundleBudget
  ? 'node scripts/check-demo-bundle.mjs --update-budget'
  : 'node scripts/check-demo-bundle.mjs';
run(
  updateBundleBudget
    ? 'record reviewed bundle budget update'
    : 'report exact demo gzip delta',
  budgetCommand,
  updateBundleBudget ? { KERF_UI_BUNDLE_REASON: reason } : {},
);

console.log(
  '\n[ui-change] PASS — generated projections are synchronized and change-local UI gates are green. Run npm run check before release.',
);

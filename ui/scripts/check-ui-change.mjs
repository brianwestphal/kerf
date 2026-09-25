import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  commandEnvironment,
  uiChangeGateSteps,
  uiChangeSyncSteps,
} from './lib/ui-change-plan.mjs';

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

function run({ label, command, env = {} }) {
  console.log(`\n[ui-change] ${label}`);
  // Non-interactive shell on the invoking Node: an interactive shell re-reads
  // the user's profile and can put a different `node` (with a different zlib)
  // first on PATH, which changes the measured gzip sizes of identical assets.
  const result = spawnSync(command, {
    cwd: root,
    shell: true,
    env: commandEnvironment(process.env, {
      execPath: process.execPath,
      root,
      extra: env,
    }),
    stdio: 'inherit',
  });
  if (result.status !== 0)
    throw new Error(`${label} failed with exit ${result.status ?? 'unknown'}`);
}

for (const step of uiChangeSyncSteps()) run(step);

const changed = [];
for (const path of generated)
  if (before.get(path) !== (await digest(path))) changed.push(path);
console.log(
  `\n[ui-change] checked-in projections changed: ${changed.length ? changed.join(', ') : 'none'}`,
);

for (const step of uiChangeGateSteps({ updateBundleBudget, reason })) run(step);

console.log(
  '\n[ui-change] PASS — generated projections are synchronized and change-local UI gates are green. Run npm run check before release.',
);

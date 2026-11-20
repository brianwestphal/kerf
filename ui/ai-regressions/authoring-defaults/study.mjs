import { spawnSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const { maxAttempts } = JSON.parse(
  await readFile(path.join(dir, '../conditions-v3.json'), 'utf8'),
);
const cells = [
  'kerf-current-1',
  'solid-current-1',
  'react-current-1',
  'react-current-2',
  'solid-current-2',
  'kerf-current-2',
  'kerf-candidate-1',
  'kerf-candidate-2',
];
function run(script, ...args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: dir,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(script + ' failed for ' + args.join(' '));
}
async function exists(file) {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
const passing = new Set();
for (let number = 1; number <= maxAttempts; number++) {
  for (const cell of cells) {
    if (passing.has(cell)) continue;
    const id = number === 1 ? cell : cell + '-a' + number;
    const folder = path.join(dir, 'attempts', id);
    if (!(await exists(path.join(folder, 'response.json'))))
      run('generate.mjs', ...cell.split('-'), String(number));
    run('score.mjs', id);
    const outcome = JSON.parse(
      await readFile(path.join(folder, 'outcome.json'), 'utf8'),
    );
    if (
      outcome.compile?.pass &&
      outcome.build &&
      Object.values(outcome.tasks).every((task) => task.pass)
    )
      passing.add(cell);
  }
}

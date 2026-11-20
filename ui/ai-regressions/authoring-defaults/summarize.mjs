import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'attempts',
);
const rows = [];
for (const id of (await readdir(root))
  .filter((id) => !id.startsWith('.'))
  .sort()) {
  const folder = path.join(root, id);
  const read = async (name) =>
    JSON.parse(await readFile(path.join(folder, name), 'utf8'));
  const run = await read('run.json');
  const outcome = await read('outcome.json');
  const passing =
    outcome.compile?.pass &&
    outcome.build &&
    ['label', 'rows', 'picker', 'remount'].every((k) => outcome.tasks[k]?.pass);
  rows.push({ run, outcome, passing });
}
const count = (items, test) => items.filter(test).length;
const range = (nums) => [Math.min(...nums), Math.max(...nums)].join('–');
for (const condition of [
  'kerf-current',
  'kerf-candidate',
  'solid-current',
  'react-current',
]) {
  const group = rows.filter((r) => r.run.id.startsWith(condition));
  const first = group.filter((r) => r.run.attempt === 1);
  const calibrations = first
    .flatMap((r) => Object.values(r.outcome.calibration))
    .filter((v) => v !== null);
  console.log(
    JSON.stringify({
      condition,
      firstPass: count(first, (r) => r.passing),
      compiled: count(first, (r) => r.outcome.compile?.pass),
      bundled: count(first, (r) => r.outcome.build),
      tasks: Object.fromEntries(
        ['label', 'rows', 'picker', 'remount'].map((k) => [
          k,
          count(first, (r) => r.outcome.tasks[k]?.pass),
        ]),
      ),
      predictions:
        calibrations.filter(Boolean).length + '/' + calibrations.length,
      firstWallSeconds: range(
        first.map((r) => Math.round(r.run.elapsedMs / 1000)),
      ),
      firstInputTokens: range(first.map((r) => r.run.usage.input_tokens)),
      firstOutputTokens: range(first.map((r) => r.run.usage.output_tokens)),
      attempts: group.length,
      finished: count(group, (r) => r.passing),
    }),
  );
}

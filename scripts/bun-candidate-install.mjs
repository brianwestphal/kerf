// Disposable qualification only: production installs remain npm ci.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const packages = new Set([
  '.',
  'ui',
  'site',
  'editor',
  'eslint-plugin',
  'create-kerf-component',
  'examples/reactivity-demo',
]);
const relative = process.argv[2];
if (!packages.has(relative)) throw new Error('Pass a known candidate package');
const root = resolve(import.meta.dirname, '..');
const cwd = resolve(root, relative);
const evidence = process.env.BUN_QUALIFICATION_EVIDENCE;
if (!evidence) throw new Error('BUN_QUALIFICATION_EVIDENCE is required');
mkdirSync(evidence, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
  return result.stdout.trim();
}
const digest = (path) =>
  createHash('sha256')
    .update(readFileSync(join(cwd, path)))
    .digest('hex');
const before = {
  manifest: digest('package.json'),
  npmLock: digest('package-lock.json'),
};
const version = run('bun', ['--version']);
if (version !== '1.4.4') throw new Error(`Expected Bun 1.4.4, got ${version}`);
if (!existsSync(join(cwd, 'bun.lock'))) run('bun', ['pm', 'migrate']);
const candidateLock = digest('bun.lock');
run('bun', ['install', '--frozen-lockfile']);
if (
  before.manifest !== digest('package.json') ||
  before.npmLock !== digest('package-lock.json') ||
  candidateLock !== digest('bun.lock')
)
  throw new Error('Frozen candidate install changed an input manifest or lock');

const label = relative === '.' ? 'root' : relative.replaceAll('/', '-');
writeFileSync(
  join(evidence, `${label}.bun.lock`),
  readFileSync(join(cwd, 'bun.lock')),
);
const manifest = {
  package: relative,
  commit: run('git', ['rev-parse', 'HEAD']),
  node: process.version,
  npm: run('npm', ['--version']),
  bun: version,
  platform: process.platform,
  arch: process.arch,
  canonicalCiSha256: process.env.BUN_QUALIFICATION_CI_SHA256 ?? null,
  input: before,
  bunLock: candidateLock,
  moduleKiB: run('du', ['-sk', 'node_modules']).split(/\s+/)[0],
  lifecyclePolicy: 'Bun default trust policy; no trust overrides',
};
writeFileSync(
  join(evidence, `${label}.json`),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `Candidate installed: ${basename(cwd)} ${JSON.stringify(manifest)}`,
);

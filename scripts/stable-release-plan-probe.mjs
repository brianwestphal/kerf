// Exercise the actual stable CLI in a disposable clean main branch, without a remote.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const source = resolve(process.argv[2] ?? '.');
const evidence = resolve(
  process.env.BUN_QUALIFICATION_EVIDENCE ??
    (() => {
      throw new Error('BUN_QUALIFICATION_EVIDENCE is required');
    })(),
);
mkdirSync(evidence, { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), 'kerf-stable-plan-'));
const fixture = join(scratch, 'repo');
mkdirSync(fixture);
const env = {
  ...process.env,
  HUSKY: '0',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  npm_config_cache: join(scratch, 'cache'),
  npm_config_userconfig: '/dev/null',
};
for (const key of Object.keys(env))
  if (
    key.startsWith('GIT_') &&
    !['GIT_CONFIG_NOSYSTEM', 'GIT_CONFIG_GLOBAL'].includes(key)
  )
    delete env[key];
function run(file, args, cwd = fixture, input) {
  const result = spawnSync(file, args, {
    cwd,
    env,
    input,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}
function snapshot() {
  const paths = run('git', ['ls-files', '-z']).split('\0').filter(Boolean);
  const hashes = Object.fromEntries(
    paths.map((path) => [
      path,
      createHash('sha256')
        .update(readFileSync(join(fixture, path)))
        .digest('hex'),
    ]),
  );
  return {
    hashes,
    status: run('git', ['status', '--porcelain']),
    refs: run('git', ['show-ref']),
    head: run('git', ['rev-parse', 'HEAD']),
    rootEntries: readdirSync(fixture).sort(),
  };
}
try {
  const sha = run('git', ['rev-parse', 'HEAD'], source).trim();
  const archive = join(scratch, 'source.tar');
  run('git', ['archive', '--format=tar', '--output', archive, sha], source);
  run('tar', ['-xf', archive], fixture);
  run('git', ['init', '-b', 'main']);
  run('git', ['config', 'user.name', 'Qualification fixture']);
  run('git', ['config', 'user.email', 'qualification@example.invalid']);
  writeFileSync(
    join(fixture, 'qualification-notes.md'),
    'Read-only stable release plan diagnostic.\n',
  );
  run('git', ['add', '.']);
  run('git', [
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'Disposable exact-source fixture',
  ]);
  assert.equal(run('git', ['remote', '-v']), '');
  const before = snapshot();
  const result = spawnSync(
    'bash',
    [
      'scripts/release.sh',
      '--dry-run',
      '--version',
      '999.0.0',
      '--notes',
      'qualification-notes.md',
      '--skip-checks',
    ],
    {
      cwd: fixture,
      env,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  writeFileSync(join(evidence, 'stable-plan.stdout.log'), result.stdout ?? '');
  writeFileSync(join(evidence, 'stable-plan.stderr.log'), result.stderr ?? '');
  const after = snapshot();
  const report = {
    sourceSha: sha,
    node: process.version,
    npm: run('npm', ['--version']).trim(),
    command:
      'bash scripts/release.sh --dry-run --version 999.0.0 --notes qualification-notes.md --skip-checks',
    status: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    before,
    after,
    scope:
      'Actual current-tree read-only CLI plan; local refs only, no artifact preparation, checks explicitly skipped, no remote or publish credentials.',
  };
  writeFileSync(
    join(evidence, 'stable-plan.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(after, before, 'Stable plan mutated its clean fixture');
  assert.match(result.stdout, /local tags only/);
  console.log(
    'Actual stable CLI plan passed; complete tracked bytes, root entries, refs, HEAD and clean status unchanged.',
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// @vitest-environment node
// KF-Y9A9XE: drive the real stable CLI in disposable repositories. Guard every
// mutating git/npm command so a dry-run cannot accidentally perform a release.
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isolatedGitEnvironment } from '../helpers/git-environment.js';
import { loadScaledTimeout } from '../helpers/load-scaled-timeout.js';

const sourceRoot = resolve(import.meta.dirname, '../..');
const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
const environment = isolatedGitEnvironment({
  ...process.env,
  GIT_AUTHOR_NAME: 'Release Test',
  GIT_AUTHOR_EMAIL: 'release@example.test',
  GIT_COMMITTER_NAME: 'Release Test',
  GIT_COMMITTER_EMAIL: 'release@example.test',
  GIT_CONFIG_GLOBAL: devNull,
  GIT_CONFIG_NOSYSTEM: '1',
});

let temporary: string;
let root: string;
let notes: string;
let log: string;
let bin: string;

function git(...args: string[]) {
  return execFileSync(realGit, args, {
    cwd: root,
    env: environment,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function snapshot() {
  return {
    head: git('rev-parse', 'HEAD'),
    refs: git('show-ref'),
    status: git('status', '--porcelain'),
    staged: git('diff', '--cached'),
    manifest: readFileSync(join(root, 'package.json'), 'utf8'),
    changelog: readFileSync(join(root, 'CHANGELOG.md'), 'utf8'),
    state: existsSync(join(root, '.release-state.json'))
      ? readFileSync(join(root, '.release-state.json'), 'utf8')
      : null,
  };
}

function run(args: string[], input = '') {
  return spawnSync('bash', ['scripts/release.sh', ...args], {
    cwd: root,
    env: {
      ...environment,
      PATH: `${bin}:${environment.PATH}`,
      RELEASE_TEST_LOG: log,
      RELEASE_TEST_GIT: realGit,
    },
    encoding: 'utf8',
    input,
    timeout: loadScaledTimeout(15_000),
  });
}

const dryArgs = () => ['--dry-run', '--version', '1.3.0', '--notes', notes];

beforeEach(() => {
  temporary = mkdtempSync(join(tmpdir(), 'kerf-release-stable-'));
  root = join(temporary, 'repo');
  bin = join(temporary, 'bin');
  notes = join(temporary, 'notes.md');
  log = join(temporary, 'commands.log');
  mkdirSync(join(root, 'scripts/lib'), { recursive: true });
  mkdirSync(bin);
  for (const file of ['release.sh', 'lib/release-common.sh'])
    cpSync(join(sourceRoot, 'scripts', file), join(root, 'scripts', file));
  for (const directory of ['ui', 'eslint-plugin', 'create-kerf-component'])
    mkdirSync(join(root, directory));
  writeFileSync(join(root, 'package.json'), '{"version":"1.2.3"}\n');
  writeFileSync(join(root, 'CHANGELOG.md'), '## [Unreleased]\n\n- Kept\n');
  writeFileSync(join(root, '.gitignore'), '.release-state.json\n');
  writeFileSync(notes, '## Changes\n\n- Keep literal `a\\nb` notes.\n');
  writeFileSync(log, '');
  writeFileSync(
    join(bin, 'git'),
    `#!/usr/bin/env bash
case "$1" in
  status|branch|rev-parse) exec "$RELEASE_TEST_GIT" "$@" ;;
  *) printf 'FORBIDDEN git %s\\n' "$*" >> "$RELEASE_TEST_LOG"; exit 97 ;;
esac
`,
  );
  writeFileSync(
    join(bin, 'npm'),
    `#!/usr/bin/env bash
case "$1" in
  run|test|ls) printf 'npm %s\\n' "$*" >> "$RELEASE_TEST_LOG" ;;
  *) printf 'FORBIDDEN npm %s\\n' "$*" >> "$RELEASE_TEST_LOG"; exit 97 ;;
esac
`,
  );
  writeFileSync(
    join(bin, 'npx'),
    '#!/usr/bin/env bash\nprintf "FORBIDDEN npx\\n" >> "$RELEASE_TEST_LOG"; exit 97\n',
  );
  for (const command of ['git', 'npm', 'npx'])
    chmodSync(join(bin, command), 0o755);
  git('init', '-q', '-b', 'main');
  git('add', '.');
  git('commit', '-q', '-m', 'fixture');
});

afterEach(() => rmSync(temporary, { recursive: true, force: true }));

describe(
  'stable release CLI safety (KF-Y9A9XE)',
  { timeout: loadScaledTimeout(30_000) },
  () => {
    it('validates a stable plan without release effects or saved-state changes', () => {
      const state = '{"_step":"5","version":"1.2.4","release_notes":"Saved"}\n';
      writeFileSync(join(root, '.release-state.json'), state);
      const before = snapshot();
      const result = run([...dryArgs(), '--skip-checks']);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Would release v1.3.0');
      expect(result.stdout).toContain('plan and current-tree validation only');
      expect(result.stdout).toContain('Keep literal `a\\nb`');
      expect(result.stdout).not.toContain('Resume from where');
      expect(snapshot()).toEqual(before);
      expect(readFileSync(log, 'utf8')).toBe('');
    });

    it('runs the existing current-tree checks by default, without initializing state', () => {
      const before = snapshot();
      const result = run(dryArgs());
      expect(result.status, result.stderr).toBe(0);
      expect(snapshot()).toEqual(before);
      expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual([
        'npm run typecheck',
        'npm run lint',
        'npm test',
        'npm run build',
        'npm run check',
        'npm test',
        'npm run check:scaffold-catalog-schema',
        'npm test',
      ]);
    });

    it('propagates a failed local check without release effects', () => {
      writeFileSync(join(bin, 'npm'), '#!/usr/bin/env bash\nexit 2\n');
      const before = snapshot();
      const result = run(dryArgs());
      expect(result.status).toBe(2);
      expect(result.stdout).not.toContain('Dry run complete');
      expect(snapshot()).toEqual(before);
      expect(readFileSync(log, 'utf8')).toBe('');
    });

    it.each([
      ['--unknown'],
      ['--dry-run', '--unknown'],
      ['--dryrun'],
      ['--version'],
      ['--notes'],
      ['--dry-run'],
      ['--dry-run', '--version', '--notes'],
      ['--version', '1.3.0'],
      ['--skip-checks'],
      ['--beta', '--dry-run'],
    ])(
      'rejects invalid arguments before creating release state: %j',
      (...args) => {
        const before = snapshot();
        const result = run(args);
        expect(result.status).toBe(1);
        expect(result.stderr).not.toBe('');
        expect(snapshot()).toEqual(before);
        expect(readFileSync(log, 'utf8')).toBe('');
      },
    );

    it.each(['1.3.0-beta.1', '01.3.0', '1.3', ''])(
      'rejects a non-stable version %j',
      (version) => {
        const result = run([
          '--dry-run',
          `--version=${version}`,
          `--notes=${notes}`,
        ]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('requires --version X.Y.Z');
        expect(existsSync(join(root, '.release-state.json'))).toBe(false);
      },
    );

    it('rejects missing or whitespace-only notes', () => {
      const missing = run([
        '--dry-run',
        '--version=1.3.0',
        '--notes=missing.md',
      ]);
      expect(missing.status).toBe(1);
      writeFileSync(notes, ' \n\t\n');
      const empty = run(dryArgs());
      expect(empty.status).toBe(1);
      expect(empty.stderr).toContain('Release notes are empty');
      expect(existsSync(join(root, '.release-state.json'))).toBe(false);
    });

    it('refuses existing tags, dirty checkouts, and non-shipping branches', () => {
      git('tag', 'v1.3.0');
      expect(run(dryArgs()).stderr).toContain('Tag v1.3.0 already exists');
      git('checkout', '-q', '-b', 'feature');
      expect(run(dryArgs()).stderr).toContain('not main/master');
      git('checkout', '-q', 'main');
      writeFileSync(join(root, 'uncommitted.txt'), 'dirty');
      expect(run(dryArgs()).stderr).toContain('Working tree is dirty');
      expect(readFileSync(log, 'utf8')).toBe('');
    });

    it.each([false, true])(
      'keeps the existing interactive resume decision (beta=%j)',
      (beta) => {
        writeFileSync(
          join(root, '.release-state.json'),
          '{"_step":"5","version":"1.2.4"}\n',
        );
        const before = snapshot();
        const result = run(beta ? ['--beta'] : [], 'n\nn\n');
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout).toContain('Resume from where you left off?');
        expect(snapshot()).toEqual(before);
      },
    );

    it('prints help without starting or checking a release', () => {
      const result = run(['--help']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        'does not simulate versioned package artifacts',
      );
      expect(existsSync(join(root, '.release-state.json'))).toBe(false);
      expect(readFileSync(log, 'utf8')).toBe('');
    });
  },
);

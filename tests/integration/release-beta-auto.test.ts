import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../..');
const temporaryRoots: string[] = [];

function git(root: string, ...args: string[]): void {
  execFileSync('git', args, { cwd: root, stdio: 'pipe' });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('automatic beta release dry run', () => {
  it('continues beta.23 as beta.24 instead of starting a stable-derived line', () => {
    const root = mkdtempSync(join(tmpdir(), 'kerf-beta-auto-'));
    temporaryRoots.push(root);
    mkdirSync(join(root, 'scripts/lib'), { recursive: true });
    cpSync(
      join(repoRoot, 'scripts/release-beta-auto.sh'),
      join(root, 'scripts/release-beta-auto.sh'),
    );
    cpSync(
      join(repoRoot, 'scripts/lib/release-beta-plan.mjs'),
      join(root, 'scripts/lib/release-beta-plan.mjs'),
    );
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'release-fixture', version: '4.4.1' }),
    );

    git(root, 'init', '-b', 'main');
    git(root, 'config', 'user.name', 'Release Test');
    git(root, 'config', 'user.email', 'release-test@example.invalid');
    git(root, 'add', '.');
    git(root, 'commit', '-m', 'fixture');
    git(root, 'tag', 'v4.4.1');
    git(root, 'tag', 'v5.0.0-beta.1');
    git(root, 'tag', 'v5.0.0-beta.23');

    const output = execFileSync(
      'bash',
      [
        'scripts/release-beta-auto.sh',
        '--dry-run',
        '--skip-checks',
        '--notes-stdin',
      ],
      { cwd: root, encoding: 'utf8', input: '- Test release\n' },
    );

    expect(output).toContain(
      'Active prerelease series v5.0.0-beta.23 is current',
    );
    expect(output).toContain('would create + push v5.0.0-beta.24');
  });
});

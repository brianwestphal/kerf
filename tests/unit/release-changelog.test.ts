import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

import { updateReleaseChangelog } from '../../scripts/update-release-changelog.mjs';

const source = `# Changelog

## [Unreleased]

### Added

- A core feature.
- A companion package feature.

## [4.4.1] - 2026-08-26

- Previous release.
`;

describe('stable release changelog', { timeout: 30_000 }, () => {
  it('preserves the full Unreleased body even when beta-delta notes report no changes', () => {
    const result = updateReleaseChangelog(
      source,
      '5.0.0',
      '\n_No changes in `v5.0.0-beta.57..HEAD`._',
      '2026-09-29',
    );
    expect(result).toContain(
      '## [Unreleased]\n\n## [5.0.0] - 2026-09-29\n\n### Added\n\n- A core feature.\n- A companion package feature.',
    );
    expect(result).not.toContain('No changes');
    expect(result).toContain('## [4.4.1] - 2026-08-26\n\n- Previous release.');
  });

  it('adds a new beta delta after carried notes without duplicating an identical draft', () => {
    const result = updateReleaseChangelog(
      source,
      '5.0.0',
      '- New since beta.57.',
      '2026-09-29',
    );
    expect(result).toContain(
      '- A companion package feature.\n\n- New since beta.57.',
    );
    const duplicatedDraft = updateReleaseChangelog(
      source,
      '5.0.0',
      '- A core feature.\n- A companion package feature.',
      '2026-09-29',
    );
    expect(duplicatedDraft.match(/- A core feature\./g)).toHaveLength(1);
    expect(
      duplicatedDraft.match(/- A companion package feature\./g),
    ).toHaveLength(1);
  });

  it('uses release notes when Unreleased is empty and rejects duplicate releases', () => {
    const empty = source.replace(
      '### Added\n\n- A core feature.\n- A companion package feature.\n\n',
      '',
    );
    const result = updateReleaseChangelog(
      empty,
      '5.0.0',
      '- Curated release note.',
      '2026-09-29',
    );
    expect(result).toContain(
      '## [5.0.0] - 2026-09-29\n\n- Curated release note.',
    );
    expect(() =>
      updateReleaseChangelog(result, '5.0.0', '- Repeated.', '2026-09-29'),
    ).toThrow('already has a 5.0.0 entry');
  });

  it('writes the same content through the CLI used by release.sh', () => {
    const directory = mkdtempSync(join(tmpdir(), 'kerf-changelog-'));
    const file = join(directory, 'CHANGELOG.md');
    try {
      writeFileSync(file, source);
      execFileSync(process.execPath, [
        resolve('scripts/update-release-changelog.mjs'),
        '5.0.0',
        '_No changes in `v5.0.0-beta.57..HEAD`._',
        '2026-09-29',
        file,
      ]);
      expect(readFileSync(file, 'utf8')).toBe(
        updateReleaseChangelog(
          source,
          '5.0.0',
          '_No changes in `v5.0.0-beta.57..HEAD`._',
          '2026-09-29',
        ),
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

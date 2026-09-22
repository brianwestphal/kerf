import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

const planner = resolve('scripts/lib/release-beta-plan.mjs');

function plan(
  currentVersion: string,
  currentIsStable: boolean,
  tags: string[],
  overrideVersion = '',
) {
  const output = execFileSync(
    process.execPath,
    [planner, currentVersion, String(currentIsStable), overrideVersion],
    { encoding: 'utf8', input: tags.join('\n') },
  );
  const [targetVersion, betaTag, source, previousBetaTag] = output.split('\t');
  return { targetVersion, betaTag, source, previousBetaTag };
}

describe('beta release planning', () => {
  it('continues the highest active prerelease series beyond the stable-derived target', () => {
    expect(
      plan('4.4.1', true, ['v4.4.1-beta.8', 'v5.0.0-beta.1', 'v5.0.0-beta.23']),
    ).toEqual({
      targetVersion: '5.0.0',
      betaTag: 'v5.0.0-beta.24',
      source: 'active-beta-series',
      previousBetaTag: 'v5.0.0-beta.23',
    });
  });

  it('ignores stale prerelease lines below the stable-derived next minor', () => {
    expect(plan('4.4.1', true, ['v4.4.0-beta.9'])).toEqual({
      targetVersion: '4.5.0',
      betaTag: 'v4.5.0-beta.1',
      source: 'next-minor',
      previousBetaTag: '',
    });
  });

  it('uses max beta number plus one even when the series has gaps', () => {
    expect(
      plan('4.5.0', false, [
        'v4.5.0-beta.1',
        'v4.5.0-beta.4',
        'not-a-release-tag',
      ]),
    ).toEqual({
      targetVersion: '4.5.0',
      betaTag: 'v4.5.0-beta.5',
      source: 'active-beta-series',
      previousBetaTag: 'v4.5.0-beta.4',
    });
  });

  it('honors an explicit target without switching to another beta line', () => {
    expect(
      plan('4.4.1', true, ['v5.0.0-beta.23', 'v4.6.0-beta.2'], '4.6.0'),
    ).toEqual({
      targetVersion: '4.6.0',
      betaTag: 'v4.6.0-beta.3',
      source: 'override',
      previousBetaTag: 'v4.6.0-beta.2',
    });
  });
});

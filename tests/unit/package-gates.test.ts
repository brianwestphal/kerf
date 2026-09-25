import { describe, expect, it } from 'vitest';

import {
  ciStatusWarning,
  PACKAGE_GATES,
  selectPackageGates,
} from '../../scripts/lib/package-gates.mjs';

const names = (paths: string[] | null) =>
  selectPackageGates(paths).map((gate) => gate.name);

describe('selectPackageGates', () => {
  it('runs the ui check for core source and ui changes', () => {
    expect(names(['src/mount.ts'])).toEqual(['ui:check']);
    expect(names(['ui/src/button.ts'])).toEqual(['ui:check']);
    expect(names(['package-lock.json'])).toEqual(['ui:check']);
  });

  it('scopes the sibling package tests to their own directories', () => {
    expect(names(['eslint-plugin/lib/rules/x.js'])).toEqual([
      'eslint-plugin:test',
    ]);
    expect(names(['create-kerf-component/index.js'])).toEqual([
      'create-kerf-component:test',
    ]);
  });

  it('runs nothing for changes no package gate covers', () => {
    expect(
      names(['docs/4-render.md', 'CHANGELOG.md', 'tests/unit/a.ts']),
    ).toEqual([]);
    // A root file trigger matches exactly, not as a prefix.
    expect(names(['package.json.bak'])).toEqual([]);
  });

  it('runs every gate when the changed set is unknown', () => {
    expect(names(null)).toEqual(PACKAGE_GATES.map((gate) => gate.name));
  });
});

describe('ciStatusWarning', () => {
  it('is silent when the latest completed run passed', () => {
    expect(
      ciStatusWarning([
        { status: 'in_progress' },
        { status: 'completed', conclusion: 'success', headSha: 'abc' },
      ]),
    ).toBeNull();
    expect(ciStatusWarning([])).toBeNull();
    expect(ciStatusWarning([{ status: 'queued' }])).toBeNull();
  });

  it('warns with the sha and link when the latest completed run failed', () => {
    const warning = ciStatusWarning([
      { status: 'in_progress' },
      {
        status: 'completed',
        conclusion: 'failure',
        headSha: '8b2cf6bf0123',
        url: 'https://example.test/run/1',
      },
    ]);
    expect(warning).toContain('failure at 8b2cf6bf');
    expect(warning).toContain('https://example.test/run/1');
  });

  it('treats a cancelled run as not green', () => {
    expect(
      ciStatusWarning([{ status: 'completed', conclusion: 'cancelled' }]),
    ).toMatch(/^CI on main is cancelled at /);
  });
});

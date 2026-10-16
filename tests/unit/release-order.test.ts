import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  latestRunConclusion,
  waitForCoreRelease,
} from '../../scripts/lib/wait-for-core-release.mjs';

type Job = {
  needs?: string | string[];
  permissions?: Record<string, string>;
  steps?: { run?: string }[];
};

function jobs(workflow: string): Record<string, Job> {
  const path = resolve(
    import.meta.dirname,
    '../../.github/workflows',
    workflow,
  );
  return (parse(readFileSync(path, 'utf8')) as { jobs: Record<string, Job> })
    .jobs;
}

function needs(job: Job): string[] {
  return job.needs === undefined ? [] : [job.needs].flat();
}

function fakeClock() {
  let time = 0;
  return {
    now: () => time,
    sleep: (ms: number) => {
      time += ms;
      return Promise.resolve();
    },
  };
}

describe('waitForCoreRelease', () => {
  it('returns as soon as the core version is on npm', async () => {
    const clock = fakeClock();
    let polls = 0;
    await waitForCoreRelease({
      version: '5.0.0-beta.106',
      isPublished: () => Promise.resolve(++polls >= 3),
      coreRunConclusion: () => Promise.resolve(null),
      ...clock,
      timeoutMs: 60_000,
      intervalMs: 20_000,
    });
    expect(polls).toBe(3);
    expect(clock.now()).toBe(40_000);
  });

  it('keeps polling after a successful core run until the registry shows the version', async () => {
    const clock = fakeClock();
    let polls = 0;
    await waitForCoreRelease({
      version: '5.0.0',
      isPublished: () => Promise.resolve(++polls >= 2),
      coreRunConclusion: () => Promise.resolve('success'),
      ...clock,
      timeoutMs: 60_000,
      intervalMs: 5_000,
    });
    expect(polls).toBe(2);
  });

  it('fails fast when the core release run fails', async () => {
    const clock = fakeClock();
    await expect(
      waitForCoreRelease({
        version: '5.0.0',
        isPublished: () => Promise.resolve(false),
        coreRunConclusion: () => Promise.resolve('failure'),
        ...clock,
        timeoutMs: 60_000,
        intervalMs: 5_000,
      }),
    ).rejects.toThrow(/finished as "failure"/);
    expect(clock.now()).toBe(0);
  });

  it('fails when the version never appears within the timeout', async () => {
    const clock = fakeClock();
    await expect(
      waitForCoreRelease({
        version: '5.0.0',
        isPublished: () => Promise.resolve(false),
        coreRunConclusion: () => Promise.resolve(null),
        ...clock,
        timeoutMs: 50_000,
        intervalMs: 20_000,
      }),
    ).rejects.toThrow(/did not appear on npm/);
    expect(clock.now()).toBe(50_000);
  });
});

describe('latestRunConclusion', () => {
  it('reads the newest run and treats an unfinished one as pending', () => {
    expect(latestRunConclusion([])).toBeNull();
    expect(
      latestRunConclusion([
        {
          status: 'completed',
          conclusion: 'failure',
          created_at: '2026-10-16T10:00:00Z',
        },
        {
          status: 'in_progress',
          conclusion: null,
          created_at: '2026-10-16T11:00:00Z',
        },
      ]),
    ).toBeNull();
    expect(
      latestRunConclusion([
        {
          status: 'completed',
          conclusion: 'success',
          created_at: '2026-10-16T12:00:00Z',
        },
        {
          status: 'completed',
          conclusion: 'failure',
          created_at: '2026-10-16T10:00:00Z',
        },
      ]),
    ).toBe('success');
  });
});

describe('release workflow ordering', () => {
  const dependents = [
    'release-eslint-plugin.yml',
    'release-create-kerf-component.yml',
    'release-ui.yml',
  ];

  it.each(dependents)(
    '%s publishes only after the kerfjs core version is on npm',
    (workflow) => {
      const all = jobs(workflow);
      const gate = all['wait-for-core'];
      expect(gate).toBeDefined();
      expect(gate.permissions).toEqual({ contents: 'read', actions: 'read' });
      expect(
        gate.steps?.some((step) =>
          step.run?.startsWith('node scripts/wait-for-core-release.mjs'),
        ),
      ).toBe(true);
      expect(needs(all['npm-publish'])).toContain('wait-for-core');
    },
  );

  it('the core release workflow does not wait on itself', () => {
    expect(jobs('release.yml')['wait-for-core']).toBeUndefined();
  });
});

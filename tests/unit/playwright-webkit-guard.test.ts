// KF-YN8JNT: the interim guard on local Playwright WebKit runs.
import { describe, expect, it, vi } from 'vitest';

import {
  guardWebkitRun,
  OVERRIDE,
  webkitGuard,
} from '../../scripts/playwright-webkit-guard.mjs';

const ALL = ['chromium', 'firefox', 'webkit'];
const guard = (argv: string[], env: Record<string, string> = {}) =>
  webkitGuard({ argv: ['test', ...argv], env, projects: ALL });

describe('webkitGuard', () => {
  it('refuses a local repeated run that includes WebKit, unless overridden', () => {
    expect(guard(['--repeat-each=4']).error).toContain(
      '--repeat-each=4 that includes WebKit',
    );
    expect(guard(['--project=webkit', '--repeat-each', '3']).error).toContain(
      '--repeat-each=3',
    );
    expect(
      guard(['--project', 'chromium,webkit', '--repeat-each=2']).error,
    ).toBeDefined();
    // The override turns the refusal into the warning.
    const allowed = guard(['--repeat-each=4'], { [OVERRIDE]: '1' });
    expect(allowed.error).toBeUndefined();
    expect(allowed.warning).toContain('Local Playwright WebKit run');
  });

  it('warns on a single local WebKit run, and on an unfiltered one', () => {
    expect(guard([]).warning).toBeDefined();
    expect(guard(['--project=webkit']).warning).toBeDefined();
    expect(
      guard(['--project=WebKit', '--repeat-each=1']).warning,
    ).toBeDefined();
    // A value that is not a number counts as one.
    expect(guard(['--repeat-each=x']).error).toBeUndefined();
  });

  it('leaves CI, other engines, and configs without WebKit alone', () => {
    expect(guard(['--repeat-each=4'], { CI: 'true' })).toEqual({});
    expect(guard(['--project=chromium', '--repeat-each=10'])).toEqual({});
    expect(
      webkitGuard({
        argv: ['test', '--repeat-each=4'],
        env: {},
        projects: ['chromium'],
      }),
    ).toEqual({});
    // A trailing --project with no value selects nothing by name.
    expect(guard(['--project']).warning).toBeDefined();
  });
});

describe('guardWebkitRun', () => {
  it('throws or warns in the runner only', () => {
    const log = vi.fn();
    expect(() =>
      guardWebkitRun(ALL, { argv: ['test', '--repeat-each=2'], env: {}, log }),
    ).toThrow('includes WebKit');
    guardWebkitRun(ALL, { argv: ['test'], env: {}, log });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]![0]).toMatch(/^\[playwright-webkit-guard\] /);
    // A worker loads the config too, and does nothing there.
    guardWebkitRun(ALL, {
      argv: ['test', '--repeat-each=2'],
      env: { TEST_WORKER_INDEX: '0' },
      log,
    });
    guardWebkitRun(ALL, { argv: ['test', '--project=chromium'], env: {}, log });
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('reads this process by default', () => {
    // Vitest's own process sets CI or not; either way a config without
    // WebKit is a no-op.
    expect(() => guardWebkitRun(['chromium'])).not.toThrow();
  });
});

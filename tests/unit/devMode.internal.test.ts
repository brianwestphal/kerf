/**
 * Unit tests for the shared dev-mode gate `isDevMode()`
 * (`src/utils/devMode.ts`). `*.internal.test.ts` so the dist-full suite
 * excludes it — `isDevMode` is an internal util, not on the public barrel.
 *
 * Precedence: a boolean `globalThis.KERF_DEV` override wins unconditionally;
 * otherwise dev is ON unless `process.env.NODE_ENV === 'production'`; with no
 * `process` at all (browser / CDN import map), dev is ON.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { isDevMode } from '../../src/utils/devMode.js';

const glob = globalThis as {
  KERF_DEV?: unknown;
  process?: { env?: Record<string, string | undefined> };
};
const env = glob.process?.env as Record<string, string | undefined>;

afterEach(() => {
  delete glob.KERF_DEV;
});

describe('isDevMode()', () => {
  it('globalThis.KERF_DEV=true forces dev ON even under NODE_ENV=production', () => {
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'production';
    glob.KERF_DEV = true;
    try {
      expect(isDevMode()).toBe(true);
    } finally {
      env.NODE_ENV = prev;
    }
  });

  it('globalThis.KERF_DEV=false forces prod OFF even under a dev NODE_ENV', () => {
    glob.KERF_DEV = false;
    expect(isDevMode()).toBe(false);
  });

  it('a non-boolean KERF_DEV is ignored (falls through to NODE_ENV)', () => {
    (glob as { KERF_DEV?: unknown }).KERF_DEV = 'yes';
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      expect(isDevMode()).toBe(false);
    } finally {
      env.NODE_ENV = prev;
    }
  });

  it('no override → NODE_ENV=production is prod', () => {
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      expect(isDevMode()).toBe(false);
    } finally {
      env.NODE_ENV = prev;
    }
  });

  it('no override → any non-production NODE_ENV is dev (vitest default: "test")', () => {
    expect(isDevMode()).toBe(true);
  });

  it('no process binding at all → dev ON', () => {
    const savedProcess = glob.process;
    delete glob.process;
    try {
      expect(isDevMode()).toBe(true);
    } finally {
      glob.process = savedProcess;
    }
  });
});

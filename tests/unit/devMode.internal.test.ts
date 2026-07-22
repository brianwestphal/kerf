/**
 * KF-334 — the shared dev-mode gate `isDevMode()`. Covers the override-wins
 * precedence between `globalThis.KERF_DEV` and `process.env.NODE_ENV`, the
 * laziness contract (the global is read at call time, not memoized at import),
 * and the no-`process` (CDN/importmap consumer) fallback.
 *
 * This file is `*.internal.test.ts` so the dist-full suite excludes it — the
 * helper is internal and not on the public dist barrel.
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

describe('isDevMode() — NODE_ENV default (no override)', () => {
  it('is true under the vitest default NODE_ENV (test)', () => {
    delete glob.KERF_DEV;
    expect(isDevMode()).toBe(true);
  });

  it('is false when NODE_ENV === production', () => {
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      expect(isDevMode()).toBe(false);
    } finally {
      env.NODE_ENV = prev;
    }
  });

  it('is true when NODE_ENV is development', () => {
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'development';
    try {
      expect(isDevMode()).toBe(true);
    } finally {
      env.NODE_ENV = prev;
    }
  });

  it('is true when there is no process binding at all (CDN/importmap consumer)', () => {
    const savedProcess = glob.process;
    delete glob.process;
    try {
      expect(isDevMode()).toBe(true);
    } finally {
      glob.process = savedProcess;
    }
  });
});

describe('isDevMode() — globalThis.KERF_DEV override wins', () => {
  it('KERF_DEV=false forces production behavior even under a dev NODE_ENV', () => {
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'development';
    glob.KERF_DEV = false;
    try {
      expect(isDevMode()).toBe(false);
    } finally {
      env.NODE_ENV = prev;
    }
  });

  it('KERF_DEV=true forces dev behavior even under NODE_ENV=production', () => {
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'production';
    glob.KERF_DEV = true;
    try {
      expect(isDevMode()).toBe(true);
    } finally {
      env.NODE_ENV = prev;
    }
  });

  it('a non-boolean override is ignored — falls through to NODE_ENV', () => {
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'production';
    // Truthy but not a boolean: must NOT be treated as the override.
    glob.KERF_DEV = 1;
    try {
      expect(isDevMode()).toBe(false);
    } finally {
      env.NODE_ENV = prev;
    }
  });
});

describe('isDevMode() — laziness', () => {
  it('reads the override at call time, not at import (set after import takes effect)', () => {
    // The module was imported at the top of the file with no override present.
    // Setting it now and observing the change proves the read is not memoized.
    delete glob.KERF_DEV;
    expect(isDevMode()).toBe(true);
    glob.KERF_DEV = false;
    expect(isDevMode()).toBe(false);
    glob.KERF_DEV = true;
    expect(isDevMode()).toBe(true);
  });
});

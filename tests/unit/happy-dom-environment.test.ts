// @vitest-environment node
import { expect, it } from 'vitest';

import environment from '../happy-dom-environment.js';

it('isolates DOM storage from native host getters and restores them on teardown', async () => {
  const target: Record<string, unknown> = { console };
  const native = () => {
    throw new Error('Native storage must never be read by DOM setup');
  };
  for (const key of ['localStorage', 'sessionStorage'])
    Object.defineProperty(target, key, { get: native, configurable: true });

  const result = await environment.setup(target, {});
  try {
    const local = target.localStorage as Storage;
    const session = target.sessionStorage as Storage;
    local.setItem('draft', 'saved');
    session.setItem('draft', 'session');
    expect(local.getItem('draft')).toBe('saved');
    expect(session.getItem('draft')).toBe('session');
    expect(local.length).toBe(1);
    local.removeItem('draft');
    expect(local.length).toBe(0);
    expect(session.getItem('draft')).toBe('session');
  } finally {
    await result.teardown(target);
  }
  for (const key of ['localStorage', 'sessionStorage'])
    expect(Object.getOwnPropertyDescriptor(target, key)?.get).toBe(native);
});

it('creates fresh isolated storage for successive DOM environments', async () => {
  for (const value of ['first', 'second']) {
    const target: Record<string, unknown> = { console };
    const result = await environment.setup(target, {});
    try {
      const storage = target.localStorage as Storage;
      expect(storage.length).toBe(0);
      storage.setItem('draft', value);
      expect(storage.getItem('draft')).toBe(value);
    } finally {
      await result.teardown(target);
    }
    expect('localStorage' in target).toBe(false);
  }
});

it('restores removed host descriptors when setup cannot isolate storage', async () => {
  const target: Record<string, unknown> = { console };
  const native = () => undefined;
  Object.defineProperty(target, 'localStorage', {
    get: native,
    configurable: true,
  });
  Object.defineProperty(target, 'sessionStorage', {
    get: native,
    configurable: false,
  });
  await expect(environment.setup(target, {})).rejects.toThrow(
    'Cannot isolate host sessionStorage',
  );
  expect(Object.getOwnPropertyDescriptor(target, 'localStorage')?.get).toBe(
    native,
  );
});

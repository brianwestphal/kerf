import { describe, expect, it } from 'vitest';

import { resource } from '../../src/async.js';
import { effect } from '../../src/reactive.js';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('resource()', () => {
  it('starts idle', () => {
    const r = resource<number>();
    expect(r.value).toEqual({ status: 'idle', data: undefined, error: undefined, progress: undefined });
  });

  it('run(): idle → running → completed with data, and resolves the data', async () => {
    const r = resource<number>();
    const d = deferred<number>();
    const p = r.run(() => d.promise);
    expect(r.value.status).toBe('running');
    d.resolve(42);
    await expect(p).resolves.toBe(42);
    expect(r.value.status).toBe('completed');
    expect(r.value.data).toBe(42);
  });

  it('run() failure → failed + error, keeps previous data, and never rejects', async () => {
    const r = resource<number>();
    await r.run(() => Promise.resolve(1));
    expect(r.value.data).toBe(1);

    const err = new Error('nope');
    const result = await r.run(() => Promise.reject(err));
    expect(result).toBeUndefined(); // resolves undefined instead of rejecting
    expect(r.value.status).toBe('failed');
    expect(r.value.error).toBe(err);
    expect(r.value.data).toBe(1); // previous data preserved (stale-while-revalidate)
  });

  it('stale guard: only the latest run resolves the state', async () => {
    const r = resource<string>();
    const slow = deferred<string>();
    const fast = deferred<string>();
    const pSlow = r.run(() => slow.promise);
    const pFast = r.run(() => fast.promise);

    fast.resolve('fast');
    await pFast;
    expect(r.value.data).toBe('fast');

    slow.resolve('slow'); // stale — must be ignored
    await pSlow;
    expect(r.value.data).toBe('fast');
    expect(r.value.status).toBe('completed');
  });

  it('a stale run that FAILS does not overwrite the current state', async () => {
    const r = resource<string>();
    const stale = deferred<string>();
    const pStale = r.run(() => stale.promise);
    await r.run(() => Promise.resolve('current')); // supersede + complete
    expect(r.value.data).toBe('current');

    stale.reject(new Error('late failure')); // stale failure — must be ignored
    await pStale;
    expect(r.value.status).toBe('completed');
    expect(r.value.data).toBe('current');
    expect(r.value.error).toBeUndefined();
  });

  it('reset() returns to idle and invalidates an in-flight run', async () => {
    const r = resource<number>();
    const d = deferred<number>();
    const p = r.run(() => d.promise);
    r.reset();
    expect(r.value.status).toBe('idle');
    d.resolve(9);
    await p;
    expect(r.value).toEqual({ status: 'idle', data: undefined, error: undefined, progress: undefined });
  });

  it('progress: the fetcher can report while running; cleared on completion; a stale report is ignored', async () => {
    const r = resource<string>();
    const d = deferred<string>();
    let staleReport!: (c: number, t: number) => void;
    const p = r.run((report) => {
      staleReport = report;
      report(1, 4);
      return d.promise;
    });
    expect(r.value.progress).toEqual({ completed: 1, total: 4 });

    // Supersede with a newer run, then fire the OLD report — it must be ignored.
    void r.run(() => new Promise<string>(() => { /* never settles */ }));
    staleReport(3, 4);
    expect(r.value.progress).toBeUndefined();

    d.resolve('done'); // stale run resolving — ignored
    await p;
  });

  it('value is a tracking read — effects re-run across the status transitions', async () => {
    const r = resource<number>();
    const seen: string[] = [];
    const stop = effect(() => { seen.push(r.value.status); });
    expect(seen).toEqual(['idle']);
    await r.run(() => Promise.resolve(1));
    expect(seen).toContain('running');
    expect(seen[seen.length - 1]).toBe('completed');
    stop();
  });
});

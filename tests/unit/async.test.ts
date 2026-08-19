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
    expect(r.value).toEqual({ status: 'idle', data: undefined, error: undefined, progress: undefined, input: undefined });
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
    expect(r.value).toEqual({ status: 'idle', data: undefined, error: undefined, progress: undefined, input: undefined });
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

  describe('run(input, fetcher): input threading', () => {
    it('carries input through running → completed', async () => {
      const r = resource<number, { fileId: string }>();
      const d = deferred<number>();
      const p = r.run({ fileId: 'a' }, () => d.promise);
      expect(r.value.status).toBe('running');
      expect(r.value.input).toEqual({ fileId: 'a' });
      d.resolve(1);
      await p;
      expect(r.value.status).toBe('completed');
      expect(r.value.input).toEqual({ fileId: 'a' }); // still available after success
    });

    it('carries input through to the FAILED state (the whole point)', async () => {
      const r = resource<number, string>();
      const err = new Error('boom');
      const result = await r.run('doc-7', () => Promise.reject(err));
      expect(result).toBeUndefined();
      expect(r.value.status).toBe('failed');
      expect(r.value.error).toBe(err);
      expect(r.value.input).toBe('doc-7'); // recover which request failed
    });

    it('input is the LATEST run under the stale guard', async () => {
      const r = resource<string, number>();
      const slow = deferred<string>();
      const fast = deferred<string>();
      const pSlow = r.run(1, () => slow.promise);
      const pFast = r.run(2, () => fast.promise);
      expect(r.value.input).toBe(2); // reflects the newest run immediately

      fast.resolve('fast');
      await pFast;
      expect(r.value.input).toBe(2);

      slow.resolve('slow'); // stale — must not clobber input back to 1
      await pSlow;
      expect(r.value.input).toBe(2);
      expect(r.value.data).toBe('fast');
    });

    it('the no-input run(fetcher) form leaves input undefined, and clears a prior input', async () => {
      const r = resource<number, string>();
      await r.run('x', () => Promise.resolve(1));
      expect(r.value.input).toBe('x');
      await r.run(() => Promise.resolve(2)); // no-input form supersedes
      expect(r.value.data).toBe(2);
      expect(r.value.input).toBeUndefined();
    });

    it('run(undefined, fetcher) is still the two-arg form (input set to undefined explicitly)', async () => {
      const r = resource<number, string | undefined>();
      await r.run('prev', () => Promise.resolve(1));
      await r.run(undefined, () => Promise.resolve(2));
      expect(r.value.status).toBe('completed');
      expect(r.value.data).toBe(2);
      expect(r.value.input).toBeUndefined();
    });

    it('reset() clears input back to undefined', async () => {
      const r = resource<number, string>();
      await r.run('y', () => Promise.resolve(1));
      expect(r.value.input).toBe('y');
      r.reset();
      expect(r.value.input).toBeUndefined();
    });
  });
});

/**
 * `kerfjs/async` — model async state, with the stale-response guard built in.
 *
 * Every real kerf app reproduces the same shape — `{ status, data, error }` —
 * for loading/error UI, each paired with a hand-rolled generation counter so a
 * slow response can't overwrite a newer one. This subpath blesses exactly that,
 * and no more: you still write the fetch (Node `fetch` for SSR, browser `fetch`
 * client-side), and `.run()` owns the status transitions plus the stale guard.
 *
 *   import { resource } from 'kerfjs/async';
 *
 *   const users = resource<User[]>();
 *   users.run(() => fetch('/api/users').then((r) => r.json()));
 *   // render off users.value.status: 'idle' | 'running' | 'completed' | 'failed'
 *
 * Only the LATEST run may resolve the state, so out-of-order responses are
 * dropped automatically. Optional progress: declare the `report` parameter on
 * your fetcher and call it (e.g. from an upload's progress events).
 */
import { signal } from './reactive.js';

/** The lifecycle status of a {@link Resource}. */
export type ResourceStatus = 'idle' | 'running' | 'completed' | 'failed';

/** Optional progress for a long-running fetch (uploads, chunked work). */
export interface ResourceProgress {
  completed: number;
  total: number;
}

/** The reactive state a {@link Resource} exposes. */
export interface ResourceState<T> {
  status: ResourceStatus;
  /** The last successful value. Kept across a re-run (stale-while-revalidate) and on failure. */
  data: T | undefined;
  /** The rejection from the most recent failed run. */
  error: unknown;
  /** Latest reported progress while running, or `undefined`. */
  progress: ResourceProgress | undefined;
}

/**
 * The fetcher passed to {@link Resource.run}. You own the transport. It receives
 * a `report(completed, total)` callback for optional progress — ignore it if you
 * don't need progress (a plain `() => Promise<T>` is assignable here).
 */
export type ResourceFetcher<T> = (report: (completed: number, total: number) => void) => Promise<T>;

/** An async-state container. Its `value` is a tracking read; drive UI off `value.status`. */
export interface Resource<T> {
  /** Tracking read of the current {@link ResourceState}. */
  readonly value: ResourceState<T>;
  /**
   * Run `fetcher`, driving `idle`/`running` → `completed`/`failed` and guarding
   * against stale responses (only the latest run resolves the state). Never
   * rejects — a failure lands in `value.error`; resolves with the data (or
   * `undefined` on failure) for callers who want to await it.
   */
  run(fetcher: ResourceFetcher<T>): Promise<T | undefined>;
  /** Reset to `idle` (clearing data/error/progress) and invalidate any in-flight run. */
  reset(): void;
}

const IDLE = <T>(): ResourceState<T> => ({
  status: 'idle',
  data: undefined,
  error: undefined,
  progress: undefined,
});

/** Create an async-state {@link Resource}. No per-instance framework state — it's a closure over a signal. */
export function resource<T>(): Resource<T> {
  const state = signal<ResourceState<T>>(IDLE<T>());
  // Per-resource run counter (closure-local, not module state) — the stale guard.
  let generation = 0;

  function run(fetcher: ResourceFetcher<T>): Promise<T | undefined> {
    const gen = ++generation;
    state.value = { ...state.value, status: 'running', error: undefined, progress: undefined };

    const report = (completed: number, total: number): void => {
      if (gen === generation) {
        state.value = { ...state.value, progress: { completed, total } };
      }
    };

    return fetcher(report).then(
      (data) => {
        if (gen === generation) {
          state.value = { status: 'completed', data, error: undefined, progress: undefined };
        }
        return data;
      },
      (error: unknown) => {
        if (gen === generation) {
          state.value = { ...state.value, status: 'failed', error, progress: undefined };
        }
        return undefined;
      },
    );
  }

  function reset(): void {
    generation++; // invalidate any in-flight run
    state.value = IDLE<T>();
  }

  return {
    get value() {
      return state.value;
    },
    run,
    reset,
  };
}

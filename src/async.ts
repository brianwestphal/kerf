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
 *
 * Pass an input — `run(input, fetcher)` — to carry which request a run is for
 * through to `value.input` (set for `running`/`completed`/`failed`), so a
 * failure handler can recover the id/params of the run that failed:
 *
 *   const diff = resource<Diff, { fileId: string }>();
 *   diff.run({ fileId }, (report) => fetchDiff(fileId, report));
 *   // on failure: diff.value.status === 'failed' && diff.value.input.fileId
 *
 * For a real SWR-with-cache section, pass `cacheKey` to keep the last value PER
 * input key (switching back to a loaded key paints its cached slice instantly
 * while it revalidates), and read `value.revision` — a counter that bumps only
 * when `data` actually CHANGES (by `equals`, default `Object.is`) — to skip a
 * redundant paint when a poll tick returns identical data:
 *
 *   const win = resource<Slice, string>({ cacheKey: (w) => w, equals: sameSlice });
 *   win.run(w, () => fetchSlice(w));  // instant cached paint for a revisited w
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
export interface ResourceState<T, I = void> {
  status: ResourceStatus;
  /** The last successful value. Kept across a re-run (stale-while-revalidate) and on failure. */
  data: T | undefined;
  /** The rejection from the most recent failed run. */
  error: unknown;
  /** Latest reported progress while running, or `undefined`. */
  progress: ResourceProgress | undefined;
  /**
   * The input of the LATEST run — the value passed to {@link Resource.run} as
   * `run(input, fetcher)`. Set for `running`, `completed`, AND `failed` (same
   * stale-guard rule as the rest of the state), so an effect can branch on
   * `status === 'failed'` and still know which request failed. `undefined` in
   * `idle`, and for the no-input `run(fetcher)` form.
   */
  input: I | undefined;
  /**
   * A monotonic counter that increments only when `data` actually CHANGES (by
   * the resource's `equals`, default `Object.is`). Compare it against the value
   * you last painted to skip a redundant re-render — e.g. a 30s poll returning
   * identical data leaves `revision` untouched, so you can bail before wiping
   * scroll / sort / hover state. Starts at `0`.
   */
  revision: number;
}

/** Construction options for {@link resource}. */
export interface ResourceOptions<T, I = void> {
  /**
   * Derive a cache key from a run's `input`. When set, the resource keeps the
   * last successful value PER key: starting a run for a key that was loaded
   * before paints its cached slice immediately (still `running`) while the fetch
   * revalidates in the background; a never-loaded key starts with no `data`.
   * Without `cacheKey`, a run keeps the previous run's `data` (single-slot
   * stale-while-revalidate), as before.
   */
  cacheKey?: (input: I) => string;
  /**
   * Equality used to decide whether `data` changed (drives `value.revision`).
   * Default `Object.is`. Pass a structural comparison to dedup a poll that
   * returns a fresh-but-equal object.
   */
  equals?: (a: T, b: T) => boolean;
}

/**
 * The fetcher passed to {@link Resource.run}. You own the transport. It receives
 * a `report(completed, total)` callback for optional progress — ignore it if you
 * don't need progress (a plain `() => Promise<T>` is assignable here).
 */
export type ResourceFetcher<T> = (report: (completed: number, total: number) => void) => Promise<T>;

/**
 * An async-state container. Its `value` is a tracking read; drive UI off
 * `value.status`. `I` is the run-input type — parametrize it (`resource<T, I>()`)
 * to carry a typed `run(input, fetcher)` input through to `value.input`.
 */
export interface Resource<T, I = void> {
  /** Tracking read of the current {@link ResourceState}. */
  readonly value: ResourceState<T, I>;
  /**
   * Run `fetcher`, driving `idle`/`running` → `completed`/`failed` and guarding
   * against stale responses (only the latest run resolves the state). Never
   * rejects — a failure lands in `value.error`; resolves with the data (or
   * `undefined` on failure) for callers who want to await it.
   */
  run(fetcher: ResourceFetcher<T>): Promise<T | undefined>;
  /**
   * Run `fetcher` for a given `input`, exposing it as `value.input` for the
   * `running`/`completed`/`failed` states of THIS run — so a failure handler can
   * recover which request failed. Same stale guard: only the latest run resolves.
   */
  run(input: I, fetcher: ResourceFetcher<T>): Promise<T | undefined>;
  /** Reset to `idle` (clearing data/error/progress/input, and the per-key cache) and invalidate any in-flight run. */
  reset(): void;
}

/** Create an async-state {@link Resource}. No per-instance framework state — it's a closure over a signal. */
export function resource<T, I = void>(options: ResourceOptions<T, I> = {}): Resource<T, I> {
  const { cacheKey, equals } = options;
  const eq: (a: T, b: T) => boolean = equals ?? Object.is;
  const cache = new Map<string, T>(); // per-key SWR cache (GC-tied to the resource)

  // Revision tracking: `revision` bumps only when `data` changes (by `eq`).
  let revision = 0;
  let lastData: T | undefined;
  const changed = (next: T | undefined): boolean =>
    // undefined transitions are handled by reference; two defined values by `eq`.
    lastData === undefined || next === undefined ? lastData !== next : !eq(lastData, next);
  const commit = (next: T | undefined): number => {
    if (changed(next)) {
      revision++;
      lastData = next;
    }
    return revision;
  };

  const state = signal<ResourceState<T, I>>({
    status: 'idle',
    data: undefined,
    error: undefined,
    progress: undefined,
    input: undefined,
    revision: 0,
  });
  // Per-resource run counter (closure-local, not module state) — the stale guard.
  let generation = 0;

  function run(
    inputOrFetcher: I | ResourceFetcher<T>,
    maybeFetcher?: ResourceFetcher<T>,
  ): Promise<T | undefined> {
    // Two-arg form is (input, fetcher); one-arg form is (fetcher) with no input.
    // A fetcher is always a function, so `maybeFetcher === undefined` uniquely
    // identifies the one-arg call — even when the input value is itself undefined.
    const fetcher = (maybeFetcher ?? inputOrFetcher) as ResourceFetcher<T>;
    const input = (maybeFetcher === undefined ? undefined : inputOrFetcher) as I | undefined;
    const key = cacheKey !== undefined && maybeFetcher !== undefined ? cacheKey(input as I) : undefined;

    // What `data` shows while running: the cached slice for this key (per-key
    // SWR), or the previous run's data (single-slot SWR) when no cacheKey.
    const runningData = cacheKey !== undefined
      ? (key !== undefined ? cache.get(key) : undefined)
      : state.value.data;

    const gen = ++generation;
    state.value = {
      status: 'running',
      data: runningData,
      error: undefined,
      progress: undefined,
      input,
      revision: commit(runningData),
    };

    const report = (completed: number, total: number): void => {
      if (gen === generation) {
        state.value = { ...state.value, progress: { completed, total } };
      }
    };

    return fetcher(report).then(
      (data) => {
        if (gen === generation) {
          if (key !== undefined) cache.set(key, data);
          state.value = {
            status: 'completed',
            data,
            error: undefined,
            progress: undefined,
            input,
            revision: commit(data),
          };
        }
        return data;
      },
      (error: unknown) => {
        if (gen === generation) {
          // Keep `data` (and thus `revision`) on failure — stale-while-error.
          state.value = { ...state.value, status: 'failed', error, progress: undefined, input };
        }
        return undefined;
      },
    );
  }

  function reset(): void {
    generation++; // invalidate any in-flight run
    cache.clear();
    state.value = {
      status: 'idle',
      data: undefined,
      error: undefined,
      progress: undefined,
      input: undefined,
      revision: commit(undefined),
    };
  }

  return {
    get value() {
      return state.value;
    },
    run,
    reset,
  };
}

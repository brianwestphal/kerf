// Redux-style state management via kerf's `defineStore`.
//
// Demonstrates the three patterns the Redux migration page covers:
//   1. Sync actions (increment / decrement / reset) — Redux Toolkit slice equivalent.
//   2. Async action with loading/error states — RTK thunk equivalent.
//   3. localStorage persistence via an `effect()` — redux-persist equivalent.
//
// Mirrors the worked examples in site/src/content/docs/migrating/redux.md.

import { defineStore, effect, mount, delegate } from 'kerfjs';

// --- Counter store -------------------------------------------------------

const STORAGE_KEY = 'kerf-counter-store';

interface CounterState {
  count: number;
  lastBumpedAt: string | null; // ISO string so it round-trips through JSON
}

function loadCounter(): CounterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lastBumpedAt: null };
    return JSON.parse(raw) as CounterState;
  } catch {
    return { count: 0, lastBumpedAt: null };
  }
}

const counter = defineStore({
  initial: loadCounter,
  actions: (set, get) => ({
    increment: () => set({ count: get().count + 1, lastBumpedAt: new Date().toISOString() }),
    decrement: () => set({ count: get().count - 1, lastBumpedAt: new Date().toISOString() }),
    reset: () => set({ count: 0, lastBumpedAt: null }),
  }),
});

// Persist on every change — RTK's `redux-persist` equivalent.
effect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counter.state.value));
});

// --- Async-fetch store ---------------------------------------------------

interface FetchState {
  data: { id: number; name: string } | null;
  loading: boolean;
  error: string | null;
}

// Mock fetcher — resolves to a deterministic value or rejects depending on
// the argument. Lets the Playwright spec exercise both branches without a
// real network.
function mockFetch(succeed: boolean): Promise<{ id: number; name: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (succeed) resolve({ id: 42, name: 'Kerf store demo' });
      else reject(new Error('Simulated network failure'));
    }, 80);
  });
}

const remote = defineStore({
  initial: (): FetchState => ({ data: null, loading: false, error: null }),
  actions: (set) => ({
    fetch: async (succeed: boolean): Promise<void> => {
      set({ data: null, loading: true, error: null });
      try {
        const data = await mockFetch(succeed);
        set({ data, loading: false, error: null });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        set({ data: null, loading: false, error: msg });
      }
    },
  }),
});

// --- Render --------------------------------------------------------------

const counterRoot = document.querySelector('[data-counter]') as HTMLElement;
mount(counterRoot, () => {
  const { count, lastBumpedAt } = counter.state.value;
  return (
    <div data-counter>
      <h2>Counter</h2>
      <div class="count" data-count>{count}</div>
      <div class="meta" data-meta>
        last bumped: {lastBumpedAt ? new Date(lastBumpedAt).toLocaleTimeString() : 'never'}
      </div>
      <div class="row">
        <button data-action="inc">+1</button>
        <button data-action="dec">−1</button>
        <button data-action="reset">Reset</button>
      </div>
    </div>
  );
});

const asyncRoot = document.querySelector('[data-async]') as HTMLElement;
mount(asyncRoot, () => {
  const { data, loading, error } = remote.state.value;
  return (
    <div data-async>
      <h2>Async action (fetch + load/error states)</h2>
      <div class="async-status" data-async-status>
        {loading ? 'loading…' : error ? `error: ${error}` : data ? 'ok' : 'idle'}
      </div>
      <div class="row">
        <button data-action="fetch-ok">Fetch (succeeds)</button>
        <button data-action="fetch-fail">Fetch (fails)</button>
      </div>
      <div class="async-data" data-async-data>
        {data ? JSON.stringify(data, null, 2) : ''}
      </div>
    </div>
  );
});

// --- Events --------------------------------------------------------------

delegate(document.body, 'click', '[data-action="inc"]', () => counter.actions.increment());
delegate(document.body, 'click', '[data-action="dec"]', () => counter.actions.decrement());
delegate(document.body, 'click', '[data-action="reset"]', () => counter.actions.reset());
delegate(document.body, 'click', '[data-action="fetch-ok"]', () => { void remote.actions.fetch(true); });
delegate(document.body, 'click', '[data-action="fetch-fail"]', () => { void remote.actions.fetch(false); });

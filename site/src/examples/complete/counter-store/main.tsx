// Redux-style state management via kerf's `defineStore`.
//
// Demonstrates the three patterns the Redux migration page covers:
//   1. Sync actions (increment / decrement / reset) — Redux Toolkit slice equivalent.
//   2. Async action with loading/error states — RTK thunk equivalent.
//   3. localStorage persistence via an `effect()` — redux-persist equivalent.
//
// Mirrors the worked examples in site/src/content/docs/migrating/redux.md.

import { defineStore, effect, mount, delegate, attr, type AttrSpec } from 'kerfjs';

const ACTIONS = {
  inc:       attr('data-action', 'inc'),
  dec:       attr('data-action', 'dec'),
  reset:     attr('data-action', 'reset'),
  fetchOk:   attr('data-action', 'fetch-ok'),
  fetchFail: attr('data-action', 'fetch-fail'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;

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
        <button {...ACTIONS.inc.attrs}>+1</button>
        <button {...ACTIONS.dec.attrs}>−1</button>
        <button {...ACTIONS.reset.attrs}>Reset</button>
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
        <button {...ACTIONS.fetchOk.attrs}>Fetch (succeeds)</button>
        <button {...ACTIONS.fetchFail.attrs}>Fetch (fails)</button>
      </div>
      <div class="async-data" data-async-data>
        {data ? JSON.stringify(data, null, 2) : ''}
      </div>
    </div>
  );
});

// --- Events --------------------------------------------------------------

// Page-lifetime registrations: root is `document.body`, attached once at module
// load, never torn down. The leading `void` is the explicit-discard sigil for
// `kerfjs/require-delegate-disposer` — it signals "I know this is page-lifetime
// and intentionally discarded the disposer" instead of leaving the call looking
// like an accidental discard. For transient roots (modals, route views, mount
// swaps) capture and call the disposer — see docs/5-event-delegation.md §5.3
// and the `cart-htmx` example.
void delegate(document.body, 'click', ACTIONS.inc.selector, () => counter.actions.increment());
void delegate(document.body, 'click', ACTIONS.dec.selector, () => counter.actions.decrement());
void delegate(document.body, 'click', ACTIONS.reset.selector, () => counter.actions.reset());
void delegate(document.body, 'click', ACTIONS.fetchOk.selector, () => { void remote.actions.fetch(true); });
void delegate(document.body, 'click', ACTIONS.fetchFail.selector, () => { void remote.actions.fetch(false); });

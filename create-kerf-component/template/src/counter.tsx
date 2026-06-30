import { defineStore, delegate, type SafeHtml } from 'kerfjs';

export interface CounterState {
  count: number;
}

/**
 * (a) Per-instance state via a FACTORY.
 *
 * Each call returns an independent store, so two `<Counter>` on the same page —
 * or two apps importing this package — never share state. The trap to avoid is a
 * module-scope `signal`/`store`: that would be a singleton shared by every
 * instance. A reusable component must never own per-instance module state; hand
 * the consumer a factory (here) or accept a signal/store via props.
 */
export function createCounter(start = 0) {
  return defineStore({
    initial: (): CounterState => ({ count: start }),
    actions: (set, get) => ({
      inc: () => set({ count: get().count + 1 }),
      dec: () => set({ count: get().count - 1 }),
    }),
  });
}

export type CounterStore = ReturnType<typeof createCounter>;

export interface CounterProps {
  store: CounterStore;
  label?: string;
}

/**
 * The component is a pure function `(props) => SafeHtml`. It emits stable
 * `data-action` hooks instead of inline event handlers — inline `onClick={...}`
 * handlers don't survive kerf's morph (and the `no-inline-jsx-event-handlers`
 * lint rule flags them). The host wires the events; see `wireCounter` below.
 */
export function Counter({ store, label = 'Count' }: CounterProps): SafeHtml {
  return (
    <div class="kerf-counter">
      <button type="button" data-action="counter:dec" aria-label="Decrement">
        −
      </button>
      <output>
        {label}: {store.state.value.count}
      </output>
      <button type="button" data-action="counter:inc" aria-label="Increment">
        +
      </button>
    </div>
  );
}

/**
 * (b) A `wire(root)` delegation disposer.
 *
 * Components can't attach their own listeners (no lifecycle, re-rendered every
 * paint), so the host calls this ONCE at its `mount()` root and disposes on
 * teardown. `delegate()` lives on the root, not on the component's nodes, so the
 * single listener survives every re-render. Returns the disposer `delegate()`
 * hands back — call it when the host unmounts.
 */
export function wireCounter(root: HTMLElement, store: CounterStore): () => void {
  return delegate(root, 'click', '[data-action^="counter:"]', (_event, el) => {
    const action = el.getAttribute('data-action');
    if (action === 'counter:inc') store.actions.inc();
    else if (action === 'counter:dec') store.actions.dec();
  });
}

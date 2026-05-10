/**
 * KF-123 / consumer-app: real downstream app bundled against `dist/` and
 * exercised by Playwright. Imports come from `kerfjs` — Node resolution
 * walks up to the repo's `package.json` and lands on `dist/index.js` etc.,
 * the same shape an `npm install kerfjs` consumer sees.
 *
 * Each zone exercises one or more public primitives. Playwright clicks /
 * types / asserts the visible DOM through `tests/browser/consumer-app.spec.ts`.
 */

import {
  batch,
  computed,
  defineStore,
  delegate,
  delegateCapture,
  each,
  effect,
  Fragment,
  isSafeHtml,
  mount,
  raw,
  signal,
  toElement,
  type SafeHtml,
} from 'kerfjs';
import { arraySignal } from 'kerfjs/array-signal';
import type { KerfCustomElement } from 'kerfjs/jsx-runtime';

declare module 'kerfjs/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'kf-widget': KerfCustomElement & { greeting?: string; count?: number };
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Zone 1 — counter: signal + computed + mount + delegate
// ────────────────────────────────────────────────────────────────
{
  const root = document.getElementById('zone-counter')!;
  const count = signal(0);
  const doubled = computed(() => count.value * 2);
  let renderTicks = 0;
  effect(() => { count.value; renderTicks++; });
  mount(root, () => (
    <div>
      <h2>Counter</h2>
      <div class="row">
        <button data-action="inc" data-testid="counter-inc">+</button>
        <button data-action="dec" data-testid="counter-dec">−</button>
        <span data-testid="counter-value">{count.value}</span>
        <span data-testid="counter-doubled">×2={doubled.value}</span>
        <span data-testid="counter-ticks">ticks:{renderTicks}</span>
      </div>
    </div>
  ));
  delegate(root, 'click', '[data-action="inc"]', () => { count.value += 1; });
  delegate(root, 'click', '[data-action="dec"]', () => { count.value -= 1; });
}

// ────────────────────────────────────────────────────────────────
// Zone 2 — store: defineStore + actions + batch
// ────────────────────────────────────────────────────────────────
{
  const root = document.getElementById('zone-store')!;
  const cart = defineStore({
    initial: () => ({ items: [] as { id: string; name: string }[], coupon: '' }),
    actions: (set, get) => ({
      add: (id: string, name: string) =>
        set({ items: [...get().items, { id, name }] }),
      remove: (id: string) =>
        set({ items: get().items.filter((i) => i.id !== id) }),
      applyAndClear: (code: string) =>
        batch(() => {
          set({ ...get(), coupon: code });
          set({ ...get(), items: [] });
        }),
    }),
  });
  mount(root, () => (
    <div>
      <h2>Store</h2>
      <div class="row">
        <button data-action="add-a" data-testid="store-add-a">add A</button>
        <button data-action="add-b" data-testid="store-add-b">add B</button>
        <button data-action="apply-coupon" data-testid="store-apply">apply SAVE10 + clear</button>
        <span data-testid="store-count">items:{cart.state.value.items.length}</span>
        <span data-testid="store-coupon">coupon:{cart.state.value.coupon || '(none)'}</span>
      </div>
      <ul data-testid="store-list">
        {each(
          cart.state.value.items,
          (i) => (
            <li data-key={i.id}>
              {i.name}
              <button data-action="remove" data-id={i.id} data-testid={`store-remove-${i.id}`}>×</button>
            </li>
          ),
          (i) => i.id,
        )}
      </ul>
    </div>
  ));
  delegate(root, 'click', '[data-action="add-a"]', () => cart.actions.add(`a-${Date.now()}`, 'A'));
  delegate(root, 'click', '[data-action="add-b"]', () => cart.actions.add(`b-${Date.now()}`, 'B'));
  delegate(root, 'click', '[data-action="apply-coupon"]', () => cart.actions.applyAndClear('SAVE10'));
  delegate(root, 'click', '[data-action="remove"]', (_e, btn) => {
    cart.actions.remove((btn as HTMLElement).dataset.id!);
  });
}

// ────────────────────────────────────────────────────────────────
// Zone 3 — each(): keyed list, identity-based memo, plain array reactivity
// ────────────────────────────────────────────────────────────────
{
  const root = document.getElementById('zone-each')!;
  const items = signal<{ id: number; label: string }[]>([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Bravo' },
    { id: 3, label: 'Charlie' },
  ]);
  let renderCalls = 0;
  mount(root, () => {
    renderCalls++;
    return (
      <div>
        <h2>each()</h2>
        <div class="row">
          <button data-action="reverse" data-testid="each-reverse">reverse</button>
          <button data-action="rename-1" data-testid="each-rename">rename #1</button>
          <span data-testid="each-renders">renders:{renderCalls}</span>
        </div>
        <ol data-testid="each-list">
          {each(
            items.value,
            (i) => (
              <li data-key={i.id} data-testid={`each-item-${i.id}`}>
                <input data-testid={`each-input-${i.id}`} value={i.label} />
              </li>
            ),
            (i) => i.id,
          )}
        </ol>
      </div>
    );
  });
  delegate(root, 'click', '[data-action="reverse"]', () => {
    items.value = [...items.value].reverse();
  });
  delegate(root, 'click', '[data-action="rename-1"]', () => {
    items.value = items.value.map((i) => (i.id === 1 ? { id: 1, label: 'Alpha-RENAMED' } : i));
  });
}

// ────────────────────────────────────────────────────────────────
// Zone 4 — arraySignal: granular patches, push/update/move/remove
// ────────────────────────────────────────────────────────────────
{
  const root = document.getElementById('zone-array')!;
  const rows = arraySignal<{ id: number; label: string }>([
    { id: 1, label: 'one' },
    { id: 2, label: 'two' },
  ]);
  let nextId = 3;
  mount(root, () => (
    <div>
      <h2>arraySignal</h2>
      <div class="row">
        <button data-action="push" data-testid="array-push">push</button>
        <button data-action="update0" data-testid="array-update0">update[0]</button>
        <button data-action="move" data-testid="array-move">move 0→last</button>
        <button data-action="remove0" data-testid="array-remove0">remove[0]</button>
        <span data-testid="array-len">len:{rows.value.length}</span>
      </div>
      <ul data-testid="array-list">
        {each(rows, (r) => <li data-key={r.id} data-testid={`array-row-${r.id}`}>{r.label}</li>)}
      </ul>
    </div>
  ));
  delegate(root, 'click', '[data-action="push"]', () => {
    rows.push({ id: nextId, label: `row-${nextId}` });
    nextId++;
  });
  delegate(root, 'click', '[data-action="update0"]', () => {
    if (rows.value.length > 0) rows.update(0, (r) => ({ ...r, label: `${r.label}!` }));
  });
  delegate(root, 'click', '[data-action="move"]', () => {
    if (rows.value.length > 1) rows.move(0, rows.value.length - 1);
  });
  delegate(root, 'click', '[data-action="remove0"]', () => {
    if (rows.value.length > 0) rows.remove(0);
  });
}

// ────────────────────────────────────────────────────────────────
// Zone 5 — delegateCapture: explicit-capture escape hatch
// ────────────────────────────────────────────────────────────────
{
  const root = document.getElementById('zone-capture')!;
  const captured = signal(0);
  mount(root, () => (
    <div>
      <h2>delegateCapture</h2>
      <input type="text" data-testid="capture-input" placeholder="focus me" />
      <span data-testid="capture-count">focuses:{captured.value}</span>
    </div>
  ));
  delegateCapture(root, 'focus', 'input', () => { captured.value += 1; });
}

// ────────────────────────────────────────────────────────────────
// Zone 6 — focus survival across re-renders
// ────────────────────────────────────────────────────────────────
{
  const root = document.getElementById('zone-focus')!;
  const tick = signal(0);
  setInterval(() => { tick.value += 1; }, 50);
  mount(root, () => (
    <div>
      <h2>Focus survival</h2>
      <input type="text" data-testid="focus-input" placeholder="type without losing focus" />
      <span data-testid="focus-tick">tick:{tick.value}</span>
    </div>
  ));
}

// ────────────────────────────────────────────────────────────────
// Zone 7 — data-morph-skip + raw + isSafeHtml
// ────────────────────────────────────────────────────────────────
{
  const root = document.getElementById('zone-skip')!;
  const tick = signal(0);
  setInterval(() => { tick.value += 1; }, 50);
  const rawHtml: SafeHtml = raw('<i data-testid="skip-injected">injected</i>');
  mount(root, () => (
    <div>
      <h2>data-morph-skip + raw</h2>
      <span data-testid="skip-tick">tick:{tick.value}</span>
      <div class="skip-host" data-morph-skip data-testid="skip-host">
        {rawHtml}
        <span data-testid="skip-issafehtml">{isSafeHtml(rawHtml) ? 'safe-true' : 'safe-false'}</span>
      </div>
    </div>
  ));
  // Imperatively mutate the skipped subtree; the diff must leave it alone.
  setTimeout(() => {
    const host = root.querySelector('[data-testid="skip-host"]')!;
    const stamp = document.createElement('em');
    stamp.dataset.testid = 'skip-stamp';
    stamp.textContent = 'stamped';
    host.appendChild(stamp);
  }, 100);
}

// ────────────────────────────────────────────────────────────────
// Zone 8 — toElement: SVG-aware DOM
// ────────────────────────────────────────────────────────────────
{
  const root = document.getElementById('zone-svg')!;
  root.innerHTML = '<h2>toElement(SVG)</h2><div data-testid="svg-host"></div>';
  const host = root.querySelector('[data-testid="svg-host"]')!;
  const svg = toElement(
    <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" data-testid="svg-root">
      <circle cx={10} cy={10} r={8} fill="navy" />
    </svg>,
  );
  host.appendChild(svg);
}

// ────────────────────────────────────────────────────────────────
// Zone 9 — Fragment + nested SafeHtml composition
// ────────────────────────────────────────────────────────────────
{
  const root = document.getElementById('zone-fragment')!;
  const a = signal('one');
  const b = signal('two');
  mount(root, () => (
    <div>
      <h2>Fragment</h2>
      <Fragment>
        <span data-testid="frag-a">{a.value}</span>
        <span data-testid="frag-b">{b.value}</span>
      </Fragment>
      <button data-action="frag-swap" data-testid="frag-swap">swap</button>
    </div>
  ));
  delegate(root, 'click', '[data-action="frag-swap"]', () => {
    const av = a.value;
    a.value = b.value;
    b.value = av;
  });
}

// ────────────────────────────────────────────────────────────────
// Zone 10 — declaration-merged custom element (KF-100 + KF-123)
// ────────────────────────────────────────────────────────────────
{
  const root = document.getElementById('zone-merge')!;
  mount(root, () => (
    <div>
      <h2>Declaration-merged custom element</h2>
      <kf-widget greeting="hi" count={3} data-testid="merge-widget">
        kf-widget body
      </kf-widget>
    </div>
  ));
}

(window as unknown as { kerfConsumerReady: boolean }).kerfConsumerReady = true;

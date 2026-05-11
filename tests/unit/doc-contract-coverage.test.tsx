/**
 * KF-104 — doc-contract coverage. Each test pins a documented assertion
 * from `docs/` or `README.md` that the audit identified as untested at
 * the API surface. The goal: every behavioral promise the framework
 * makes to users is verified at the public-import boundary.
 *
 * Cross-reference (audit §3 / §4):
 *  - signal: object replaced with `===`-equal new object
 *  - defineStore: action throws mid-set
 *  - delegate: re-entrance — handler triggers re-render
 *  - delegateCapture: stop-propagation interaction with delegate
 *  - toElement: SVG and HTML routing
 *  - arraySignal: non-object items throw via each()'s primitive-check
 *  - clearStoreRegistry: removes registered stores
 *  - docs/4-render.md §4.4 — replaced row loses focus (KF-65 partial)
 *  - docs/4-render.md §4.4.1 — controlled <details> via imperative removeAttribute
 *  - docs/5-event-delegation.md §5.4 — listeners on rebuilt nodes are lost
 *  - docs/8-api-reference.md §8.7 — range/color input morph behavior
 *  - signal NOT deep-reactive (docs/2-reactivity.md §2.7)
 *  - effect disposer stops re-runs after dispose
 *  - Fragment composes children without a wrapper tag
 *  - raw() bypasses HTML escaping
 *  - mount() throws on null root with descriptive error
 *  - each() throws on duplicate refs (immutable-update reminder)
 *  - each() throws on primitive items
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import {
  computed,
  defineStore,
  delegate,
  delegateCapture,
  each,
  effect,
  Fragment,
  mount,
  raw,
  resetAllStores,
  signal,
  toElement,
} from '../../src/index.js';
import { clearStoreRegistry } from '../../src/testing.js';

describe('Doc contract coverage (KF-104)', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; clearStoreRegistry(); });

  describe('signal contracts (docs/2-reactivity.md)', () => {
    it('signal NOT deep-reactive: mutating in place does not notify', () => {
      const arr = signal<number[]>([1, 2, 3]);
      let runs = 0;
      effect(() => { void arr.value; runs++; });
      expect(runs).toBe(1);
      arr.value.push(4);  // in-place mutation
      expect(runs).toBe(1);  // no notification
      arr.value = [...arr.value];  // new ref
      expect(runs).toBe(2);
    });

    it('replacing a signal with a new object reference (even structurally equal) notifies', () => {
      const obj = signal<{ a: number }>({ a: 1 });
      let runs = 0;
      effect(() => { void obj.value; runs++; });
      expect(runs).toBe(1);
      obj.value = { a: 1 };  // new ref, structurally same
      expect(runs).toBe(2);
    });

    it('effect disposer stops re-runs', () => {
      const x = signal(0);
      let runs = 0;
      const dispose = effect(() => { void x.value; runs++; });
      expect(runs).toBe(1);
      x.value = 1;
      expect(runs).toBe(2);
      dispose();
      x.value = 2;
      expect(runs).toBe(2);
    });
  });

  describe('store contracts (docs/3-stores.md)', () => {
    it('action throwing mid-set leaves state at the previously-set value', () => {
      const store = defineStore({
        initial: () => ({ count: 0 }),
        actions: (set, get) => ({
          incTwiceThenThrow: (): void => {
            set({ count: get().count + 1 });
            set({ count: get().count + 1 });
            throw new Error('boom');
          },
        }),
      });
      expect(() => store.actions.incTwiceThenThrow()).toThrow();
      // Both .set() calls executed before the throw, so state reflects the
      // last set; the throw doesn't roll back.
      expect(store.state.value.count).toBe(2);
    });

    it('clearStoreRegistry removes registered stores so resetAllStores is a no-op', () => {
      const store = defineStore({
        initial: () => ({ x: 0 }),
        actions: (set) => ({ inc: (): void => set({ x: 1 }) }),
      });
      store.actions.inc();
      expect(store.state.value.x).toBe(1);
      clearStoreRegistry();
      // Mutate the store to a different value, then call resetAllStores —
      // since the registry was cleared, reset does nothing for our store.
      store.actions.inc();
      expect(store.state.value.x).toBe(1);  // already 1; just confirm not reset
      resetAllStores();  // should not touch the deregistered store
      expect(store.state.value.x).toBe(1);
    });

    it('computed re-runs only when its dependency value changes', () => {
      const a = signal(1);
      const b = signal('unrelated');
      let runs = 0;
      const c = computed(() => { runs++; return a.value * 2; });
      expect(c.value).toBe(2);
      expect(runs).toBe(1);
      // Mutating an unrelated signal does NOT invalidate the computed.
      b.value = 'x';
      expect(c.value).toBe(2);
      expect(runs).toBe(1);
      // Mutating the dependency does.
      a.value = 5;
      expect(c.value).toBe(10);
      expect(runs).toBe(2);
    });
  });

  describe('mount contracts (docs/4-render.md)', () => {
    it('mount throws a descriptive error when rootEl is null', () => {
      expect(() => mount(null as unknown as HTMLElement, () => 'x')).toThrow(/null\/undefined/);
    });

    it('focused row that is REPLACED loses focus (the documented trade-off)', () => {
      // docs/4-render.md §4.4: "Replaced rows are a different story: the old
      // node is removed before the new one is inserted, so focus that lived
      // inside it is genuinely gone."
      const items = signal<{ id: number; ver: number }[]>([{ id: 1, ver: 1 }]);
      mount(root, () => (
        <ul>
          {each(items.value, (it) => (
            <li data-key={String(it.id)}>
              <input type="text" defaultValue={`v${it.ver}`} />
            </li>
          ), (it) => `${it.id}-${it.ver}`)}
        </ul>
      ));
      const input = root.querySelector('input')!;
      input.focus();
      expect(document.activeElement).toBe(input);
      // Same id but different cacheKey → cache miss → row replaced.
      items.value = [{ id: 1, ver: 2 }];
      // Old input was removed; focus is gone.
      expect(document.activeElement).not.toBe(input);
    });

    it('controlled <details open> via imperative removeAttribute (docs §4.4.1)', () => {
      const isOpen = signal(true);
      mount(root, () => (
        <details id="panel" open={isOpen.value}>
          <summary>title</summary>
          body
        </details>
      ));
      const panel = root.querySelector('details')!;
      expect(panel.hasAttribute('open')).toBe(true);
      // Documented workaround: drive `open` imperatively from a signal effect
      // since the morph treats `open` as user-agent-owned.
      effect(() => {
        if (!isOpen.value) panel.removeAttribute('open');
      });
      isOpen.value = false;
      expect(panel.hasAttribute('open')).toBe(false);
    });
  });

  describe('event delegation contracts (docs/5-event-delegation.md)', () => {
    it('listeners attached imperatively to rebuilt nodes are lost (§5.4)', () => {
      const items = signal([{ id: 1 }]);
      mount(root, () => (
        <ul>
          {each(items.value, (it) => <li data-key={String(it.id)}>x</li>)}
        </ul>
      ));
      let directClicks = 0;
      const li1 = root.querySelector('li')!;
      li1.addEventListener('click', () => directClicks++);
      li1.click();
      expect(directClicks).toBe(1);
      // Replace the row (different ref → cache miss → fresh node).
      items.value = [{ id: 1 }];
      const li2 = root.querySelector('li')!;
      expect(li2).not.toBe(li1);  // new node
      li2.click();
      expect(directClicks).toBe(1);  // listener gone with the old node
    });

    it('delegate handler triggering a re-render does NOT lose its own subscription', () => {
      const count = signal(0);
      mount(root, () => (
        <button data-action="inc">{count.value}</button>
      ));
      let handlerCalls = 0;
      delegate(root, 'click', '[data-action="inc"]', () => {
        handlerCalls++;
        count.value += 1;
      });
      const btn = (): HTMLButtonElement => root.querySelector('button')!;
      btn().click();
      expect(handlerCalls).toBe(1);
      expect(btn().textContent).toBe('1');
      // Click the (re-rendered) button again — delegate's listener is on
      // the root, so the re-render of the button doesn't disturb it.
      btn().click();
      expect(handlerCalls).toBe(2);
      expect(btn().textContent).toBe('2');
    });

    it('delegateCapture stopPropagation prevents bubbling delegate from firing', () => {
      mount(root, () => (
        <div className="outer">
          <button data-action="inner">click me</button>
        </div>
      ));
      const captureCalls: string[] = [];
      const bubbleCalls: string[] = [];
      delegateCapture(root, 'click', '[data-action="inner"]', (e) => {
        captureCalls.push('capture');
        e.stopPropagation();
      });
      delegate(root, 'click', '[data-action="inner"]', () => {
        bubbleCalls.push('bubble');
      });
      root.querySelector('button')!.click();
      expect(captureCalls).toEqual(['capture']);
      expect(bubbleCalls).toEqual([]);  // capture stopped propagation
    });
  });

  describe('jsx-runtime contracts (docs/6-jsx-runtime.md)', () => {
    it('Fragment composes children without a wrapper tag', () => {
      const f = <Fragment><span>a</span><span>b</span></Fragment>;
      expect(f.toString()).toBe('<span>a</span><span>b</span>');
    });

    it('raw() bypasses HTML escaping', () => {
      const escaped = <div>{'<script>'}</div>;
      const rawed = <div>{raw('<script>alert(1)</script>')}</div>;
      expect(escaped.toString()).toBe('<div>&lt;script&gt;</div>');
      expect(rawed.toString()).toBe('<div><script>alert(1)</script></div>');
    });

    it('regular string children ARE escaped (XSS defense)', () => {
      const userInput = '<img src=x onerror="alert(1)">';
      const out = <div>{userInput}</div>;
      expect(out.toString()).not.toContain('<img');
      expect(out.toString()).toContain('&lt;img');
    });
  });

  describe('toElement contracts (docs/7-svg.md)', () => {
    it('parses HTML through the html path', () => {
      const el = toElement('<button id="x">click</button>');
      expect(el.tagName).toBe('BUTTON');
      expect(el.id).toBe('x');
    });

    it('parses SVG via the DOMParser path (namespace verified in toElement.test.ts under jsdom)', () => {
      // happy-dom's `DOMParser('image/svg+xml')` is broken for SVG (returns
      // a document with null documentElement); jsdom and real browsers get
      // it right. The dedicated `tests/unit/toElement.test.ts` uses jsdom
      // for that reason — see CLAUDE.md "tech stack" notes. Here we assert
      // basic structural integrity.
      const el = toElement('<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>');
      expect(el.tagName.toLowerCase()).toBe('svg');
      expect(el.querySelector('circle')).not.toBe(null);
    });

    it('throws on input that produces no element', () => {
      expect(() => toElement('   ')).toThrow();
    });
  });

  describe('each() contracts (docs/8-api-reference.md)', () => {
    it('throws on duplicate item references', () => {
      const dup = { id: 1 };
      expect(() => mount(root, () => (
        <ul>{each([dup, dup], (r) => <li data-key={String(r.id)}>x</li>)}</ul>
      ))).toThrow(/same object reference/);
    });

    it('throws on primitive items with a useful message', () => {
      expect(() => mount(root, () => (
        <ul>{each([1, 2, 3] as unknown[] as object[], () => <li>x</li>)}</ul>
      ))).toThrow(/items must be objects/);
    });

    it('arraySignal of non-object items: each() throws when reading', () => {
      // arraySignal can technically hold primitives, but each()'s WeakMap
      // cache requires objects. Verify the error path.
      const sig = arraySignal<unknown>([1, 2, 3]);
      expect(() => mount(root, () => (
        <ul>{each(sig as unknown as ReturnType<typeof arraySignal<{ id: number }>>,
          (r) => <li data-key={String(r.id)}>x</li>)}</ul>
      ))).toThrow(/items must be objects/);
    });

    it('per-item key argument forces re-render when external state changes (selected-id pattern)', () => {
      const items = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }];
      const selectedId = signal(1);
      mount(root, () => (
        <ul>
          {each(items, (it) => (
            <li data-key={String(it.id)} className={it.id === selectedId.value ? 'selected' : ''}>
              {it.label}
            </li>
          ), (it) => `${it.id}-${it.id === selectedId.value ? 1 : 0}`)}
        </ul>
      ));
      expect(root.querySelectorAll('li.selected').length).toBe(1);
      expect(root.querySelectorAll('li.selected')[0].textContent).toBe('a');
      selectedId.value = 2;
      expect(root.querySelectorAll('li.selected').length).toBe(1);
      expect(root.querySelectorAll('li.selected')[0].textContent).toBe('b');
    });
  });

  describe('arraySignal contracts (docs/2-reactivity.md §2.6)', () => {
    it('out-of-bounds operations throw with descriptive messages', () => {
      const a = arraySignal([{ id: 1 }, { id: 2 }]);
      expect(() => a.update(5, (r) => r)).toThrow(/index 5.*out of bounds/);
      expect(() => a.insert(99, { id: 99 })).toThrow(/index 99.*out of bounds/);
      expect(() => a.remove(-1)).toThrow(/index -1.*out of bounds/);
      expect(() => a.move(0, 99)).toThrow(/out of bounds/);
    });

    it('move with from === to is a no-op (no patch emitted)', () => {
      const a = arraySignal([{ id: 1 }, { id: 2 }]);
      const before = (a as unknown as { _patches: unknown[] })._patches.length;
      a.move(1, 1);
      const after = (a as unknown as { _patches: unknown[] })._patches.length;
      expect(after).toBe(before);
    });

    it('initial array is defensively copied (caller mutation does not leak)', () => {
      const seed = [{ id: 1 }, { id: 2 }];
      const a = arraySignal(seed);
      seed.push({ id: 3 });  // mutate caller's array
      expect(a.value.length).toBe(2);  // signal unaffected
    });
  });
});

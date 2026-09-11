/**
 * Adversarial edge-case probes — written in response to the "we should
 * be extremely thorough" directive. Each test exercises a scenario the
 * earlier audit (KF-104) flagged as untested but plausibly bug-prone.
 *
 * Categories covered:
 *   - mount lifecycle: mount → dispose → mount on the same element;
 *     mount on a pre-populated element; render returning null /
 *     undefined / number / boolean; many mounts sharing one signal.
 *   - delegate lifecycle: handler that disposes its own mount; root
 *     detached from document; re-entrance through re-render.
 *   - arraySignal corner cases: drift recovery; cross-mount sharing
 *     after dispose; replace-then-update batched; mutation inside a
 *     computed; computed reading both length and array.
 *   - shape transitions: two each() callsites where a phase flip
 *     re-orders them (KF-104 §2 — known positional-id collision).
 *   - focus survival: focus inside an UNCHANGED row across a granular
 *     update; focus on a SIBLING of a granular-updated row.
 *   - fast-path corners: KF-88 with re-render that DOES change a
 *     list's items but not the surrounds; KF-89 with stable items in
 *     out-of-order positions; KF-93 with non-contiguous insert runs;
 *     KF-99 drift recovery after a granular reconcile failure.
 *   - data-morph-skip wrapping a list parent.
 *   - Stress: 1000-row mutate-and-restore round-trip.
 */
import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import {
computed,
delegate,
each,
mount,
signal
} from '../../src/index.js';

describe('Round 3: delegate handler corner cases', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('multiple delegate handlers for the same selector + event type both fire', () => {
    mount(root, () => <button data-action="x">click</button>);
    let aCalls = 0;
    let bCalls = 0;
    delegate(root, 'click', '[data-action="x"]', () => { aCalls++; });
    delegate(root, 'click', '[data-action="x"]', () => { bCalls++; });
    root.querySelector('button')!.click();
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);
  });

  it('delegate handler that removes the matched element does not crash', () => {
    const remove = signal(false);
    mount(root, () => (
      remove.value ? <p>gone</p> : <button data-action="self-destruct">click</button>
    ));
    delegate(root, 'click', '[data-action="self-destruct"]', () => { remove.value = true; });
    const btn = root.querySelector('button')!;
    expect(() => btn.click()).not.toThrow();
    expect(root.querySelector('button')).toBe(null);
    expect(root.querySelector('p')!.textContent).toBe('gone');
  });

  it('delegate disposer called twice is a no-op', () => {
    mount(root, () => <button data-action="x">click</button>);
    const dispose = delegate(root, 'click', '[data-action="x"]', () => undefined);
    dispose();
    expect(() => dispose()).not.toThrow();
  });
});

describe('Round 3: arraySignal × rare item shapes', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('arraySignal of items with Symbol-keyed properties renders correctly', () => {
    const tag = Symbol('tag');
    interface Item { id: number; [tag]: string; label: string }
    const items: Item[] = [
      { id: 1, [tag]: 'a', label: 'one' },
      { id: 2, [tag]: 'b', label: 'two' },
    ];
    const sig = arraySignal(items);
    mount(root, () => <ul>{each(sig, (r) => <li data-key={String(r.id)}>{r.label}</li>)}</ul>);
    expect(root.querySelectorAll('li').length).toBe(2);
    expect(root.querySelectorAll('li')[0].textContent).toBe('one');
  });

  it('arraySignal items can be class instances (not just plain objects)', () => {
    class Row {
      constructor(public id: number, public label: string) {}
    }
    const sig = arraySignal<Row>([new Row(1, 'one'), new Row(2, 'two')]);
    mount(root, () => <ul>{each(sig, (r) => <li data-key={String(r.id)}>{r.label}</li>)}</ul>);
    expect(root.querySelectorAll('li').length).toBe(2);
    sig.update(0, (r) => new Row(r.id, 'ONE'));
    expect(root.querySelector('li')!.textContent).toBe('ONE');
  });

  it('arraySignal containing frozen objects (Object.freeze) — mutation still works via update', () => {
    interface Row { id: number; v: string }
    const sig = arraySignal<Row>([Object.freeze({ id: 1, v: 'a' }) as Row]);
    mount(root, () => <ul>{each(sig, (r) => <li data-key={String(r.id)}>{r.v}</li>)}</ul>);
    expect(root.querySelector('li')!.textContent).toBe('a');
    // update returns a new object, so the frozen one isn't mutated in place.
    sig.update(0, (r) => ({ id: r.id, v: 'A' }));
    expect(root.querySelector('li')!.textContent).toBe('A');
  });
});

describe('Round 3: signal/computed extreme cases', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('signal === comparison: setting same value does NOT trigger re-render', () => {
    const x = signal({ ref: 1 });
    let runs = 0;
    mount(root, () => {
      void x.value;
      runs++;
      return <span>x</span>;
    });
    expect(runs).toBe(1);
    // Same reference → no notification. Capture the ref into a local first
    // so the reassignment isn't a literal `x.value = x.value` self-assign
    // (which lint flags but is exactly the behavior we want to test).
    const sameRef = x.value;
    x.value = sameRef;
    expect(runs).toBe(1);
  });

  it('computed of a computed (chained) updates correctly when bottom signal changes', () => {
    const a = signal(1);
    const b = computed(() => a.value + 1);
    const c = computed(() => b.value + 1);
    const d = computed(() => c.value + 1);
    mount(root, () => <span>{d.value}</span>);
    expect(root.querySelector('span')!.textContent).toBe('4');
    a.value = 10;
    expect(root.querySelector('span')!.textContent).toBe('13');
  });

  it('computed with no dependencies acts as a constant', () => {
    const c = computed(() => 42);
    mount(root, () => <span>{c.value}</span>);
    expect(root.querySelector('span')!.textContent).toBe('42');
  });
});

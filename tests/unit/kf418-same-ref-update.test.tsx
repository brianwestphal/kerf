/**
 * A same-ref `arraySignal.update()` re-renders the row in EVERY consumer.
 *
 * kerf memoizes `each()` rows by object identity, so a same-ref mutation —
 * `update(i, r => { r.t = 'X'; return r })` — changes the row's content without
 * changing the identity the memo is keyed on. KF-414 repaired only the single
 * list that drained the update patch; a second list over the same signal, a
 * second `mount()`, a plain-array `filter()` view, and the same list when the
 * render routed to snapshot all stayed stale.
 *
 * The fix (KF-418) gives every mutated item a content version (`item-version.ts`,
 * a shared `WeakMap<item, number>`); each row's cache entry records the version
 * it rendered at, and a cache hit now requires the version to still match. Any
 * consumer holding the same item ref reads the same version, so all of them
 * re-render on a same-ref update — while immutable (new-ref) updates and lists
 * that never mutate in place are unaffected.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch, each, mount, signal } from '../../src/index.js';

let root: HTMLElement;
let root2: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
  root2 = document.createElement('div');
  document.body.appendChild(root2);
});

const texts = (r: HTMLElement, sel: string): (string | null)[] =>
  Array.from(r.querySelectorAll(sel)).map((el) => el.textContent);

describe('KF-418: same-ref update propagates to every consumer', () => {
  it('a second list AND a plain-array filter view over the same signal both update', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }, { id: 2, t: 'b' }]);
    const dispose = mount(root, () => (
      <div>
        <ul class="a">{each(rows, (r) => <li data-key={`a${r.id}`}>{r.t}</li>, { key: 'A' })}</ul>
        <ul class="b">{each(rows, (r) => <li data-key={`b${r.id}`}>{r.t}</li>, { key: 'B' })}</ul>
        <ul class="f">{each(rows.value.filter((r) => r.id <= 2),
          (r) => <li data-key={`f${r.id}`}>{r.t}</li>, { key: 'F' })}</ul>
      </div>
    ));
    rows.update(0, (r) => { r.t = 'X'; return r; });
    expect(texts(root, '.a li')).toEqual(['X', 'b']);
    expect(texts(root, '.b li')).toEqual(['X', 'b']);
    expect(texts(root, '.f li')).toEqual(['X', 'b']);
    dispose();
  });

  it('a second mount over the same signal updates too', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }]);
    const d1 = mount(root, () => <ul>{each(rows, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'A' })}</ul>);
    const d2 = mount(root2, () => <ul>{each(rows, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'B' })}</ul>);
    rows.update(0, (r) => { r.t = 'X'; return r; });
    expect(texts(root, 'li')).toEqual(['X']);
    expect(texts(root2, 'li')).toEqual(['X']);
    d1();
    d2();
  });

  it('the update survives being batched with a cacheKey drift (snapshot route)', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }, { id: 2, t: 'b' }]);
    const sel = signal(-1);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id} class={sel.value === r.id ? 'on' : 'off'}>{r.t}</li>,
        { key: 'L', cacheKey: (r) => sel.value === r.id })}</ul>
    ));
    batch(() => { rows.update(0, (r) => { r.t = 'X'; return r; }); sel.value = 2; });
    expect(texts(root, 'li')).toEqual(['X', 'b']);
    dispose();
  });

  it('the update survives being batched with replace()', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }, { id: 2, t: 'b' }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'L' })}</ul>
    ));
    batch(() => {
      rows.update(0, (r) => { r.t = 'X'; return r; });
      rows.replace(rows.value.slice().reverse());
    });
    expect(texts(root, 'li')).toEqual(['b', 'X']);
    dispose();
  });

  it('a single list keeps working across repeated same-ref updates (KF-414 preserved)', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }]);
    const flag = signal(false);
    const dispose = mount(root, () => (
      <div><p>{flag.value ? '1' : '0'}</p><ul>{each(rows, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'L' })}</ul></div>
    ));
    rows.update(0, (r) => { r.t = 'X'; return r; });
    flag.value = true; // unrelated snapshot render
    expect(texts(root, 'li')).toEqual(['X']);
    rows.update(0, (r) => { r.t = 'Y'; return r; });
    flag.value = false;
    expect(texts(root, 'li')).toEqual(['Y']);
    dispose();
  });

  it('immutable (new-ref) updates are unaffected — they propagate as before', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }, { id: 2, t: 'b' }]);
    const dispose = mount(root, () => (
      <div>
        <ul class="a">{each(rows, (r) => <li data-key={`a${r.id}`}>{r.t}</li>, { key: 'A' })}</ul>
        <ul class="b">{each(rows, (r) => <li data-key={`b${r.id}`}>{r.t}</li>, { key: 'B' })}</ul>
      </div>
    ));
    rows.update(0, (r) => ({ ...r, t: 'X' }));
    expect(texts(root, '.a li')).toEqual(['X', 'b']);
    expect(texts(root, '.b li')).toEqual(['X', 'b']);
    dispose();
  });

  it('an unchanged row keeps its DOM node across a same-ref update of a DIFFERENT row', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }, { id: 2, t: 'b' }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'L' })}</ul>
    ));
    const row2 = root.querySelector('[data-key="2"]');
    rows.update(0, (r) => { r.t = 'X'; return r; });
    expect(root.querySelector('[data-key="2"]')).toBe(row2); // untouched row kept identity
    expect(texts(root, 'li')).toEqual(['X', 'b']);
    dispose();
  });
});

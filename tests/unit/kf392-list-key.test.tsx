/**
 * KF-392 — `each({ key })` gives a list a stable identity.
 *
 * Without a key a list is identified by its call order ("the n-th `each()`
 * this render"), so any render that changes how many `each()` calls run before
 * it reassigns its identity. The list is then rebuilt from scratch: row nodes,
 * focus, scroll and in-progress IME all discarded, and O(N) instead of
 * O(changes). A key removes the dependency on call order entirely.
 *
 * Two properties are worth stating because neither is obvious:
 *
 *  - A keyed list does NOT consume a call-order slot, so keying a
 *    *conditional* list also stabilizes its unkeyed siblings — you can fix a
 *    whole tree by keying the one list that comes and goes.
 *  - Keys close the same-source hole that the data-source guard cannot: two
 *    `each()` calls over one `arraySignal` are indistinguishable by source,
 *    but trivially distinguishable by key.
 *
 * NOTE on the markup here: every list container carries a `data-key`. That is
 * unrelated to this feature — it is the documented fix for a *different*
 * shape (a same-tag conditional sibling positionally taking the container's
 * place). Without it these trees would rebuild for that reason instead, and
 * the tests would prove nothing about list keys. The unkeyed control below is
 * what shows the key is doing the work.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch, each, mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => { document.body.innerHTML = ''; });

const cell = (list: string, row: string): Element | null =>
  root.querySelector(`ul[data-key="${list}"] li[data-key="${row}"]`);

describe('KF-392: each({ key }) — stable list identity', () => {
  it('a keyed list keeps row identity AND focus across a sibling list toggling, both directions', () => {
    const cond = signal(true);
    const a = arraySignal([{ id: 'a1' }]);
    const b = arraySignal([{ id: 'b1' }, { id: 'b2' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value
          ? <ul data-key="ca">{each(a, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
          : ''}
        <ul data-key="cb">
          {each(b, (r) => <li data-key={r.id}><input value={r.id} /></li>, { key: 'b' })}
        </ul>
      </div>
    ));
    const row = cell('cb', 'b1') as HTMLElement;
    const input = row.querySelector('input') as HTMLInputElement;
    input.focus();

    cond.value = false;
    expect(cell('cb', 'b1')).toBe(row);
    expect(document.activeElement).toBe(input);

    cond.value = true;
    expect(cell('cb', 'b1')).toBe(row);
    expect(document.activeElement).toBe(input);
    dispose();
  });

  it('the same tree WITHOUT a key still loses row identity (the key is what does the work)', () => {
    const cond = signal(true);
    const a = arraySignal([{ id: 'a1' }]);
    const b = arraySignal([{ id: 'b1' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value
          ? <ul data-key="ca">{each(a, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
          : ''}
        <ul data-key="cb">{each(b, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
      </div>
    ));
    const row = cell('cb', 'b1');
    cond.value = false;
    expect(cell('cb', 'b1')).not.toBe(row); // rebuilt — content still correct
    expect(cell('cb', 'b1')?.textContent).toBe('b1');
    dispose();
  });

  it('keying the CONDITIONAL list stabilizes its unkeyed sibling too', () => {
    // A keyed list doesn't take a call-order slot, so the unkeyed sibling
    // keeps slot 0 whether or not the conditional list rendered.
    const cond = signal(true);
    const a = arraySignal([{ id: 'a1' }]);
    const b = arraySignal([{ id: 'b1' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value
          ? <ul data-key="ca">{each(a, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'a' })}</ul>
          : ''}
        <ul data-key="cb">{each(b, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
      </div>
    ));
    const row = cell('cb', 'b1');
    cond.value = false;
    expect(cell('cb', 'b1')).toBe(row);
    cond.value = true;
    expect(cell('cb', 'b1')).toBe(row);
    dispose();
  });

  it('closes the same-source hole: two each() over ONE arraySignal, one conditional', () => {
    // The data-source guard cannot separate these — same instance — so this
    // shape was the one hole left in the corruption fix. Keys separate them.
    const cond = signal(true);
    const s = arraySignal([{ id: 'x', t: 'X' }, { id: 'y', t: 'Y' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value
          ? <ul data-key="c1">{each(s, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'one' })}</ul>
          : ''}
        <ul data-key="c2">{each(s, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'two' })}</ul>
      </div>
    ));
    batch(() => {
      cond.value = false;
      s.push({ id: 'z', t: 'Z' });
    });
    const shown = Array.from(root.querySelectorAll('ul[data-key="c2"] li')).map((l) => l.textContent);
    expect(shown).toEqual(s.value.map((r) => r.t));
    dispose();
  });

  it('a keyed list keeps its granular fast path (row identity survives push/update/remove)', () => {
    const rows = arraySignal([{ id: 'r1', t: 'R1' }, { id: 'r2', t: 'R2' }]);
    const dispose = mount(root, () => (
      <ul data-key="cl">{each(rows, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'rows' })}</ul>
    ));
    const r1 = cell('cl', 'r1');
    rows.push({ id: 'r3', t: 'R3' });
    expect(cell('cl', 'r1')).toBe(r1); // untouched row kept its node
    rows.update(1, (r) => ({ ...r, t: 'R2!' }));
    expect(cell('cl', 'r1')).toBe(r1);
    expect(cell('cl', 'r2')?.textContent).toBe('R2!');
    rows.remove(0);
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent))
      .toEqual(rows.value.map((r) => r.t));
    dispose();
  });

  it('two lists claiming the same key throw rather than silently sharing state', () => {
    const s = arraySignal([{ id: 'a' }]);
    expect(() => mount(root, () => (
      <div>
        <ul data-key="u1">{each(s, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'dup' })}</ul>
        <ul data-key="u2">{each(s, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'dup' })}</ul>
      </div>
    ))).toThrow(/duplicate list key "dup"/);
  });

  it('the same key across separate renders is fine (it is per-render, not once-ever)', () => {
    const bump = signal(0);
    const rows = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => {
      void bump.value; // track the signal so the render re-runs
      return <ul data-key="cl">{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'k' })}</ul>;
    });
    const row = cell('cl', 'a');
    bump.value = 1;
    bump.value = 2;
    expect(cell('cl', 'a')).toBe(row);
    dispose();
  });

  it('the legacy 3-argument cacheKey form still works unchanged', () => {
    const sel = signal('a');
    const rows = [{ id: 'a' }, { id: 'b' }];
    const dispose = mount(root, () => (
      <ul data-key="cl">
        {each(
          rows,
          (r) => <li data-key={r.id} class={sel.value === r.id ? 'on' : ''}>{r.id}</li>,
          (r) => `${r.id}:${String(sel.value === r.id)}`,
        )}
      </ul>
    ));
    expect(root.querySelector('li.on')?.getAttribute('data-key')).toBe('a');
    sel.value = 'b';
    expect(root.querySelector('li.on')?.getAttribute('data-key')).toBe('b');
    dispose();
  });

  it('cacheKey supplied through the options object behaves identically', () => {
    const sel = signal('a');
    const rows = [{ id: 'a' }, { id: 'b' }];
    const dispose = mount(root, () => (
      <ul data-key="cl">
        {each(
          rows,
          (r) => <li data-key={r.id} class={sel.value === r.id ? 'on' : ''}>{r.id}</li>,
          { cacheKey: (r) => `${r.id}:${String(sel.value === r.id)}`, key: 'sel' },
        )}
      </ul>
    ));
    expect(root.querySelector('li.on')?.getAttribute('data-key')).toBe('a');
    sel.value = 'b';
    expect(root.querySelector('li.on')?.getAttribute('data-key')).toBe('b');
    dispose();
  });
});

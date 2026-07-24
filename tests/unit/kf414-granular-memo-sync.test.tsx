/**
 * The granular path keeps the per-item HTML memo in sync with what it renders.
 *
 * "What this row currently renders" lives in two places: `binding.items[].html`
 * (the live DOM's source) and `ctx.caches` (the per-item memo the snapshot path
 * reuses). The granular path updated only the first, so after an
 * `arraySignal.update()` that mutated a row in place, a later render routed to
 * the snapshot path (any unrelated surrounds change) found the STALE memo and
 * morphed the row back to its old HTML. The two must not diverge.
 *
 * The canonical fix for the shape is immutable updates, but `update(i, fn)`
 * invites a same-ref mutation and the granular path honors it, so the two halves
 * of the reconciler must agree about it. Found by a Fable sweep.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each, mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

describe('KF-414: a granular update is not reverted by a later snapshot render', () => {
  it('a same-ref update survives an unrelated surrounds re-render', () => {
    const rows = arraySignal([{ id: 1, label: 'one' }]);
    const flag = signal(false);
    const dispose = mount(root, () => (
      <div>
        <p>{flag.value ? 'on' : 'off'}</p>
        <ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    rows.update(0, (r) => { r.label = 'two'; return r; }); // same ref, mutated
    expect(root.querySelector('li')?.textContent).toBe('two');
    flag.value = true; // unrelated surrounds change → list routes to snapshot
    expect(root.querySelector('li')?.textContent).toBe('two');
    dispose();
  });

  it('an immutable update likewise survives (the memo carries the fresh html)', () => {
    const rows = arraySignal([{ id: 1, label: 'one' }]);
    const flag = signal(false);
    const dispose = mount(root, () => (
      <div>
        <p>{flag.value ? 'on' : 'off'}</p>
        <ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    rows.update(0, (r) => ({ ...r, label: 'two' }));
    flag.value = true;
    expect(root.querySelector('li')?.textContent).toBe('two');
    dispose();
  });

  it('a granular insert survives a later snapshot render too', () => {
    const rows = arraySignal([{ id: 1, label: 'one' }]);
    const flag = signal(false);
    const dispose = mount(root, () => (
      <div>
        <p>{flag.value ? 'on' : 'off'}</p>
        <ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
      </div>
    ));
    rows.push({ id: 2, label: 'two' });
    flag.value = true;
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent))
      .toEqual(['one', 'two']);
    dispose();
  });

  it('the fix does not disturb a cacheKey-driven update', () => {
    // A cacheKey whose value changes must still re-render the row on a snapshot
    // pass; a cacheKey that does not change must still hit the memo.
    const rows = arraySignal([{ id: 1, label: 'one' }]);
    const sel = signal(1);
    const dispose = mount(root, () => (
      <div>
        <p>{String(sel.value)}</p>
        <ul>{each(
          rows,
          (r) => <li data-key={r.id} class={sel.value === r.id ? 'on' : ''}>{r.label}</li>,
          (r) => `${r.label}:${sel.value === r.id}`,
        )}</ul>
      </div>
    ));
    rows.update(0, (r) => { r.label = 'two'; return r; });
    expect(root.querySelector('li')?.textContent).toBe('two');
    sel.value = 2; // selection flips off; snapshot render
    expect(root.querySelector('li')?.textContent).toBe('two');
    expect(root.querySelector('li.on')).toBeNull();
    dispose();
  });
});

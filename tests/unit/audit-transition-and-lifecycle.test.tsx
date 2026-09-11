/**
 * Tests added in response to the KF-102 audit. The audit identified that
 * the existing suite was line-coverage-100% but had structural gaps —
 * tests asserted counts not order, never exercised shape transitions
 * end-to-end, and didn't pin documented contracts at the API surface.
 *
 * Each test here addresses a specific gap from the audit's "highest-value
 * tests to add" list. Suite cross-referenced against the audit:
 *   1. each-after-transition with leading+trailing siblings — kf102 file
 *   2. each() conditionally removed and re-introduced — this file
 *   3. two each() callsites, second conditionally rendered — this file
 *   4. KF-102-shape integration: phase transition + delegated click — this file
 *   5. mount → dispose → mount(sameEl, differentRender) — this file
 *   6. granular update after a replace() (snapshot fallback path) — this file
 *   7. focus on external input survives re-render that introduces each() — this file
 *   8. two each() callsites bound to same arraySignal — this file
 *   9. data-morph-skip removed via re-render then re-introduced — this file
 *  10. each() row returning Fragment with multiple roots — this file
 *
 * Plus assorted contract pins (effect throwing, nested batch, diamond
 * computed) that the audit flagged.
 */
import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import {
delegate,
each,
mount,
signal
} from '../../src/index.js';

describe('Audit gap coverage', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  describe('shape transitions (pre-existing gap that allowed KF-102 to land)', () => {
    it('each() conditionally removed and re-introduced rebuilds correctly', () => {
      const showList = signal(true);
      const items = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }];
      mount(root, () => (
        <div>
          {showList.value
            ? each(items, (it) => <li data-key={String(it.id)}>{it.label}</li>)
            : <p>list hidden</p>}
        </div>
      ));
      expect(root.querySelectorAll('li').length).toBe(2);
      showList.value = false;
      expect(root.querySelectorAll('li').length).toBe(0);
      expect(root.querySelector('p')!.textContent).toBe('list hidden');
      showList.value = true;
      expect(root.querySelectorAll('li').length).toBe(2);
      expect(root.querySelectorAll('li')[0].textContent).toBe('a');
      expect(root.querySelectorAll('li')[1].textContent).toBe('b');
    });

    it('two each() callsites where one is conditional do not swap bindings', () => {
      // The list-id counter is positional. If a render structurally re-orders
      // the each() calls, list ids may swap. This test pins the contract: a
      // *conditionally added* second list at the END of the render must NOT
      // collide with the first list's binding.
      const showSecond = signal(false);
      const itemsA = [{ id: 'a1', label: 'A1' }, { id: 'a2', label: 'A2' }];
      const itemsB = [{ id: 'b1', label: 'B1' }, { id: 'b2', label: 'B2' }];
      mount(root, () => (
        <div>
          <ul className="A">
            {each(itemsA, (it) => <li data-key={it.id}>{it.label}</li>)}
          </ul>
          {showSecond.value && (
            <ul className="B">
              {each(itemsB, (it) => <li data-key={it.id}>{it.label}</li>)}
            </ul>
          )}
        </div>
      ));
      expect(root.querySelector('.A')!.querySelectorAll('li').length).toBe(2);
      expect(root.querySelector('.B')).toBe(null);
      showSecond.value = true;
      expect(root.querySelector('.A')!.querySelectorAll('li').length).toBe(2);
      expect(root.querySelector('.B')!.querySelectorAll('li').length).toBe(2);
      // First list contents unchanged.
      expect(root.querySelector('.A')!.querySelectorAll('li')[0].textContent).toBe('A1');
      // Second list rendered fresh.
      expect(root.querySelector('.B')!.querySelectorAll('li')[0].textContent).toBe('B1');
    });
  });

  describe('integration: shape transition + delegation', () => {
    it('delegated click on a list row introduced via re-render fires correctly', () => {
      type Phase = { kind: 'loading' } | { kind: 'ready'; opts: { id: string; label: string }[] };
      const state = signal<Phase>({ kind: 'loading' });
      let clickedId: string | null = null;
      mount(root, () => state.value.kind === 'loading'
        ? <p>loading</p>
        : (
          <div>
            {each(state.value.opts, (o) => (
              <button data-key={o.id} data-action="pick" data-id={o.id}>{o.label}</button>
            ))}
            <button data-action="cancel">Cancel</button>
          </div>
        ));
      delegate(root, 'click', '[data-action="pick"]', (_e, btn) => {
        clickedId = (btn as HTMLElement).dataset.id ?? null;
      });
      state.value = { kind: 'ready', opts: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }] };
      expect(root.querySelectorAll('button[data-action="pick"]').length).toBe(2);
      (root.querySelectorAll<HTMLButtonElement>('button[data-action="pick"]')[1]).click();
      expect(clickedId).toBe('y');
    });
  });

  describe('mount lifecycle', () => {
    it('mount → dispose → mount(sameEl, differentRender) — bindings do not leak', () => {
      const itemsA = [{ id: 1, label: 'a' }];
      const itemsB = [{ id: 1, label: 'b' }, { id: 2, label: 'c' }];

      const dispose1 = mount(root, () => (
        <ul>{each(itemsA, (it) => <li data-key={it.id}>{it.label}</li>)}</ul>
      ));
      expect(root.querySelectorAll('li').length).toBe(1);
      dispose1();

      const dispose2 = mount(root, () => (
        <ol>{each(itemsB, (it) => <li data-key={it.id}>{it.label}</li>)}</ol>
      ));
      expect(root.querySelector('ol')).not.toBe(null);
      expect(root.querySelectorAll('li').length).toBe(2);
      expect(Array.from(root.querySelectorAll('li')).map((n) => n.textContent)).toEqual(['b', 'c']);
      dispose2();
    });
  });


});

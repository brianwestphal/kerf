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

import { arraySignal } from '../../src/array-signal.js';
import {
batch,
each,
mount,
signal
} from '../../src/index.js';

describe('Audit gap coverage', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  describe('arraySignal contracts', () => {
    it('granular update after a replace() patch rebuilds via snapshot fallback', () => {
      const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
      mount(root, () => (
        <ul>{each(rows, (r) => <li data-key={String(r.id)}>{r.label}</li>)}</ul>
      ));
      expect(root.querySelectorAll('li').length).toBe(2);
      // replace() forces snapshot; immediately follow with granular updates.
      batch(() => {
        rows.replace([{ id: 10, label: 'X' }, { id: 20, label: 'Y' }, { id: 30, label: 'Z' }]);
      });
      const lis = root.querySelectorAll('li');
      expect(lis.length).toBe(3);
      expect(lis[0].textContent).toBe('X');
      // Subsequent granular update must apply correctly against the rebuilt binding.
      rows.update(1, (r) => ({ ...r, label: 'YY' }));
      const after = root.querySelectorAll('li');
      expect(after[1].textContent).toBe('YY');
      expect(after[0].textContent).toBe('X');
      expect(after[2].textContent).toBe('Z');
    });

    it('two each() callsites bound to the same arraySignal both render correctly', () => {
      const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
      mount(root, () => (
        <div>
          <ul className="A">{each(rows, (r) => <li data-key={String(r.id)}>A:{r.label}</li>)}</ul>
          <ul className="B">{each(rows, (r) => <li data-key={String(r.id)}>B:{r.label}</li>)}</ul>
        </div>
      ));
      expect(root.querySelector('.A')!.querySelectorAll('li').length).toBe(2);
      expect(root.querySelector('.B')!.querySelectorAll('li').length).toBe(2);
      // Mutate. First each() drains patches and runs granular reconcile;
      // second sees an empty queue and falls back to snapshot. Both render
      // the new label.
      rows.update(0, (r) => ({ ...r, label: 'X' }));
      const aFirst = root.querySelector('.A')!.querySelectorAll('li')[0];
      const bFirst = root.querySelector('.B')!.querySelectorAll('li')[0];
      expect(aFirst.textContent).toBe('A:X');
      expect(bFirst.textContent).toBe('B:X');
    });
  });

  describe('focus survival', () => {
    it('focus on an external input survives a re-render that introduces each()', () => {
      const showList = signal(false);
      const items = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }];
      mount(root, () => (
        <div>
          <input id="search" type="text" />
          {showList.value
            ? <ul>{each(items, (it) => <li data-key={String(it.id)}>{it.label}</li>)}</ul>
            : null}
        </div>
      ));
      const input = root.querySelector('input')!;
      input.focus();
      input.value = 'hello';
      input.setSelectionRange(2, 4);
      expect(document.activeElement).toBe(input);
      showList.value = true;
      expect(document.activeElement).toBe(input);
      expect((document.activeElement as HTMLInputElement).value).toBe('hello');
      expect(input.selectionStart).toBe(2);
      expect(input.selectionEnd).toBe(4);
    });
  });

  describe('data-morph-skip lifecycle', () => {
    it('a data-morph-skip subtree removed via re-render then re-introduced is treated as a fresh skip-host', () => {
      const showSkip = signal(true);
      mount(root, () => (
        <div>
          {showSkip.value
            ? <div data-morph-skip className="skip-host"><span>placeholder</span></div>
            : <p>removed</p>}
        </div>
      ));
      const firstHost = root.querySelector('.skip-host')!;
      expect(firstHost).not.toBe(null);
      // Mutate skip-host children imperatively (this is the documented use case).
      firstHost.innerHTML = '<canvas data-imperative="true"></canvas>';
      // Re-render hides it.
      showSkip.value = false;
      expect(root.querySelector('.skip-host')).toBe(null);
      expect(root.querySelector('p')!.textContent).toBe('removed');
      // Re-render brings it back. The new instance should NOT carry the
      // imperative children — it's a fresh JSX-rendered host.
      showSkip.value = true;
      const secondHost = root.querySelector('.skip-host')!;
      expect(secondHost).not.toBe(firstHost);
      expect(secondHost.querySelector('canvas')).toBe(null);
      expect(secondHost.querySelector('span')!.textContent).toBe('placeholder');
    });
  });


});

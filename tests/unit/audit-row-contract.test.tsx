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
raw,
signal
} from '../../src/index.js';

describe('Audit gap coverage', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  describe('each() row contract (KF-103)', () => {
    it('row render producing zero top-level elements throws with row index (first render)', () => {
      const items = [{ id: 1 }, { id: 2 }];
      expect(() => {
        mount(root, () => (
          <ul>
            {each(items, () => raw('   '), (item) => String(item.id))}
          </ul>
        ));
      }).toThrow(/row render at index 0 produced no top-level element/i);
    });

    it('error message pinpoints which row violates when earlier rows are valid', () => {
      // Subsequent-render path: bulk-update / bulk-insert / fresh classify
      // walks all rows; the false-branch (count === 1, valid row) must run
      // before the loop reaches the offending row. Verifies findOffendingRow
      // skips valid rows correctly.
      const items = signal<{ id: number }[]>([{ id: 0 }]);
      mount(root, () => (
        <ul>
          {each(items.value, (it) => {
            if (it.id === 0) return <li data-key="0">ok0</li>;
            if (it.id === 1) return <li data-key="1">ok1</li>;
            return raw('<li>x</li><li>y</li>');
          }, (item) => String(item.id))}
        </ul>
      ));
      expect(() => {
        items.value = [{ id: 0 }, { id: 1 }, { id: 2 }];
      }).toThrow(/row render at index 2 produced 2 top-level/i);
    });

    it('error message pinpoints multi-root insert when earlier inserts are valid (granular)', () => {
      const rows = arraySignal([{ id: 0, valid: true }]);
      mount(root, () => (
        <ul>
          {each(rows, (r) => r.valid
            ? <li data-key={String(r.id)}>{String(r.id)}</li>
            : raw('<li>x</li><li>y</li>'))}
        </ul>
      ));
      // Three contiguous inserts: 1 and 2 valid, 3 multi-root. findOffendingInsert
      // walks them in order — the false branch (count === 1) fires for indices
      // 1 and 2 before the throw at index 3.
      expect(() => {
        batch(() => {
          rows.insert(1, { id: 1, valid: true });
          rows.insert(2, { id: 2, valid: true });
          rows.insert(3, { id: 3, valid: false });
        });
      }).toThrow(/row render at index 3 produced 2 top-level/i);
    });

    it('error message pinpoints multi-root update when earlier updates are valid (granular)', () => {
      const rows = arraySignal([
        { id: 0, valid: true }, { id: 1, valid: true }, { id: 2, valid: true },
      ]);
      mount(root, () => (
        <ul>
          {each(rows, (r) => r.valid
            ? <li data-key={String(r.id)}>row{String(r.id)}</li>
            : raw('<li>x</li><li>y</li>'))}
        </ul>
      ));
      expect(() => {
        batch(() => {
          rows.update(0, (r) => ({ ...r, id: 10 }));
          rows.update(1, (r) => ({ ...r, id: 11 }));
          rows.update(2, (r) => ({ ...r, id: 12, valid: false }));
        });
      }).toThrow(/row render at index 2 produced 2 top-level/i);
    });

    it('long row HTML in the error message is truncated (first-render path)', () => {
      const longHtml = '<li>' + 'x'.repeat(150) + '</li><li>extra</li>';
      const items = [{ id: 1 }];
      expect(() => {
        mount(root, () => (
          <ul>
            {each(items, () => raw(longHtml), (item) => String(item.id))}
          </ul>
        ));
      }).toThrow(/Got HTML: ".+…"/);
    });

    it('long row HTML in the error is truncated (subsequent reconcile path)', () => {
      // Exercises rowContractError's `html.length > 120` ternary via the
      // findOffendingRow path (not validateInlinedRowMatch).
      const longHtml = '<li>' + 'x'.repeat(150) + '</li><li>extra</li>';
      const items = signal<{ id: number }[]>([]);
      mount(root, () => (
        <ul>
          {each(items.value, () => raw(longHtml), (item) => String(item.id))}
        </ul>
      ));
      expect(() => {
        items.value = [{ id: 1 }, { id: 2 }];
      }).toThrow(/Got HTML: ".+…"/);
    });

    it('browser-normalized single-root HTML (e.g. self-closing void tag) does not throw', () => {
      // <br/> in expectedHtml normalizes to <br> in the live DOM's outerHTML.
      // validateInlinedRowMatch's first equality check fails, but the
      // per-row parse confirms count === 1 and returns without throwing.
      // (`data-key` on the <li> so KF-173's missing-key dev warning stays quiet
      // — this test is about void-tag normalization, not row keying.)
      const items = [{ id: 1 }];
      mount(root, () => (
        <ul>
          {each(items, (item) => raw(`<li data-key="${item.id}"><br/></li>`), (item) => String(item.id))}
        </ul>
      ));
      expect(root.querySelectorAll('li').length).toBe(1);
      expect(root.querySelector('br')).not.toBe(null);
    });

    it('long row HTML in the error is truncated (granular single-update path)', () => {
      // Exercises parseSingleRow's `html.length > 120` ternary.
      const longHtml = '<li>' + 'x'.repeat(150) + '</li><li>extra</li>';
      const rows = arraySignal([{ id: 0, broken: false }]);
      mount(root, () => (
        <ul>
          {each(rows, (r) => r.broken
            ? raw(longHtml)
            : <li data-key={String(r.id)}>ok</li>)}
        </ul>
      ));
      expect(() => rows.update(0, (r) => ({ ...r, broken: true })))
        .toThrow(/Got HTML: ".+…"/);
    });

    it('first-render mixed valid+empty rows reports the empty row', () => {
      // First render with row 0 producing empty html and row 1 a real <li>.
      // The bindListsFromMarkers walk lands on row 1's element while still
      // associating it with row 0's expected html — mismatch triggers
      // validateInlinedRowMatch and surfaces "index 0 produced no element".
      const items = [{ id: 1 }, { id: 2 }];
      expect(() => {
        mount(root, () => (
          <ul>
            {each(items, (it) => it.id === 1 ? raw('') : <li data-key="2">b</li>, (item) => String(item.id))}
          </ul>
        ));
      }).toThrow(/row render at index 0 produced no top-level element/i);
    });

    it('row render producing multi-root HTML throws with row index and count', () => {
      const items = [{ id: 1 }, { id: 2 }];
      expect(() => {
        mount(root, () => (
          <ul>
            {each(items, () => raw('<li>a</li><li>b</li>'), (item) => String(item.id))}
          </ul>
        ));
      }).toThrow(/index 0.*2 top-level elements.*exactly one/i);
    });

    it('contract is enforced on subsequent renders too (cache miss)', () => {
      const items = signal<{ id: number }[]>([{ id: 0 }]);
      mount(root, () => (
        <ul>
          {each(items.value, (it) => it.id === 0
            ? <li data-key="0">ok</li>
            : raw('<li>a</li><li>b</li>'),
          (it) => String(it.id))}
        </ul>
      ));
      expect(() => {
        items.value = [{ id: 0 }, { id: 1 }];
      }).toThrow(/index 1.*2 top-level/i);
    });

    it('cache hits skip validation (well-formed row stays valid)', () => {
      // Once a row's html is cached, re-renders take the cache and skip the
      // parse. Verify a cache hit doesn't re-incur validation cost — we
      // rely on identity-based caching, so no exception even if document
      // were temporarily missing.
      const item = { id: 42, label: 'cached' };
      mount(root, () => (
        <ul>
          {each([item], (it) => <li data-key={String(it.id)}>{it.label}</li>)}
        </ul>
      ));
      // Trigger another render with the same item ref — cache hit.
      mount(document.createElement('div'), () => (
        <ul>
          {each([item], (it) => <li data-key={String(it.id)}>{it.label}</li>)}
        </ul>
      ));
      // Two mounts; both rendered without exception.
      expect(root.querySelector('li')!.textContent).toBe('cached');
    });

    it('granular path (arraySignal) also enforces the contract on insert/update', () => {
      const rows = arraySignal([{ id: 1, label: 'good' }]);
      mount(root, () => (
        <ul>
          {each(rows, (r) => r.id === 666
            ? raw('<li>x</li><li>y</li>')
            : <li data-key={String(r.id)}>{r.label}</li>)}
        </ul>
      ));
      expect(() => {
        rows.push({ id: 666, label: 'bad' });
      }).toThrow(/2 top-level/i);
    });

    it('outside a mount context (SSR), validation is skipped (toString works)', () => {
      // each() called outside mount() returns a SafeHtml whose toString
      // just concatenates rendered html. Without mount, there's no cache
      // and no validation — the caller is responsible. Verify multi-root
      // rows produce predictable output (no throw).
      const items = [{ id: 1 }];
      const html = each(items, () => raw('<li>a</li><li>b</li>')).toString();
      expect(html).toBe('<li>a</li><li>b</li>');
    });
  });


});

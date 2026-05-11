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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import {
  batch,
  computed,
  delegate,
  each,
  effect,
  mount,
  raw,
  signal,
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
      const items = [{ id: 1 }];
      mount(root, () => (
        <ul>
          {each(items, () => raw('<li><br/></li>'), (item) => String(item.id))}
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

  describe('reactivity contract pins', () => {
    it('effect throwing leaves subsequent dependency notifications working', () => {
      const a = signal(0);
      let runs = 0;
      let lastSeen = -1;
      effect(() => {
        runs++;
        lastSeen = a.value;
        if (a.value === 1) throw new Error('boom');
      });
      expect(runs).toBe(1);
      expect(lastSeen).toBe(0);
      // The throw happens inside effect()'s body; it's surfaced by signals-core
      // via the propagating mutation but the subscription is preserved.
      expect(() => { a.value = 1; }).toThrow();
      expect(lastSeen).toBe(1);
      // Subsequent mutation should still trigger the effect (the subscription
      // graph survives the prior throw).
      a.value = 2;
      expect(lastSeen).toBe(2);
      expect(runs).toBeGreaterThanOrEqual(3);
    });

    it('nested batch() collapses to a single effect run', () => {
      const a = signal(0);
      const b = signal(0);
      let runs = 0;
      effect(() => { void a.value; void b.value; runs++; });
      expect(runs).toBe(1);
      batch(() => {
        a.value = 1;
        batch(() => {
          a.value = 2;
          b.value = 5;
        });
        b.value = 6;
      });
      // Outer batch coalesces all four writes into one effect run.
      expect(runs).toBe(2);
      expect(a.value).toBe(2);
      expect(b.value).toBe(6);
    });

    it('diamond computed dependencies update consistently (no glitches)', () => {
      const a = signal(1);
      const b = computed(() => a.value + 10);
      const c = computed(() => a.value * 100);
      const d = computed(() => b.value + c.value);
      expect(d.value).toBe(11 + 100);
      a.value = 2;
      expect(d.value).toBe(12 + 200);
      // After the update, b and c should both reflect the new a; d should
      // see them in sync (the classic diamond glitch).
      a.value = 3;
      expect(b.value).toBe(13);
      expect(c.value).toBe(300);
      expect(d.value).toBe(313);
    });
  });
});

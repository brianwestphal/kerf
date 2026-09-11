/**
 * Unit tests for `mount()`. Exercises the morph-driven re-render against a
 * happy-dom DOM, including identity preservation, focus/selection survival,
 * keyed list reorders, and the data-morph-skip escape hatch.
 */

import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { each } from '../../src/each.js';
import { jsx,raw } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mount() — focus and selection preservation', () => {
  describe('each() inside mount', () => {
    interface Row { id: number; label: string }
    const makeRows = (count: number): Row[] =>
      Array.from({ length: count }, (_, i) => ({ id: i + 1, label: `r${i + 1}` }));

    it('renders an initial list', () => {
      const rows = signal<Row[]>(makeRows(3));
      mount(root, () => jsx('ul', {
        children: each(rows.value, (r) => jsx('li', { children: r.label, 'data-key': r.id })),
      }));
      // The `<!--kf-list:0-->` marker stays in the live DOM (KF-102 round 2)
      // as a permanent anchor for the list region — items live AFTER the
      // marker, surrounding non-list siblings live OUTSIDE it. This lets
      // the static-surrounds diff coexist with each() in the same parent.
      expect(root.innerHTML).toBe(
        '<ul><!--kf-list:0--><li data-key="1">r1</li><li data-key="2">r2</li><li data-key="3">r3</li></ul>',
      );
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
      const marker = walker.nextNode() as Comment | null;
      expect(marker).not.toBe(null);
      expect(marker!.data).toBe('kf-list:0');
    });

    it('preserves identity for unchanged rows on partial update', () => {
      const rows = signal<Row[]>(makeRows(5));
      mount(root, () => jsx('ul', {
        children: each(rows.value, (r) => jsx('li', { children: r.label, 'data-key': r.id })),
      }));
      const before = Array.from(root.querySelectorAll('li'));

      // Replace only row 2 (index 1) with a new object whose label changed.
      const next = rows.value.slice();
      next[1] = { id: 2, label: 'r2!' };
      rows.value = next;

      const after = Array.from(root.querySelectorAll('li'));
      expect(after.length).toBe(5);
      expect(after[1].textContent).toBe('r2!');
      // Unchanged rows are physically the same nodes.
      expect(after[0]).toBe(before[0]);
      expect(after[2]).toBe(before[2]);
      expect(after[3]).toBe(before[3]);
      expect(after[4]).toBe(before[4]);
      // Changed row is a fresh node.
      expect(after[1]).not.toBe(before[1]);
    });

    it('moves existing nodes when the list reorders', () => {
      const rows = signal<Row[]>(makeRows(3));
      mount(root, () => jsx('ul', {
        children: each(rows.value, (r) => jsx('li', { children: r.label, 'data-key': r.id })),
      }));
      const original = Array.from(root.querySelectorAll('li'));

      // Reorder: [r1, r2, r3] → [r3, r1, r2]
      rows.value = [rows.value[2], rows.value[0], rows.value[1]];

      const reordered = Array.from(root.querySelectorAll('li'));
      // Same DOM nodes, new order.
      expect(reordered[0]).toBe(original[2]);
      expect(reordered[1]).toBe(original[0]);
      expect(reordered[2]).toBe(original[1]);
    });

    it('keeps focus on a moved row\'s descendant input across a reorder (KF-65)', () => {
      const rows = signal<Row[]>(makeRows(3));
      mount(root, () => jsx('ul', {
        children: each(
          rows.value,
          (r) => jsx('li', {
            'data-key': r.id,
            children: jsx('input', { id: `inp-${r.id}`, type: 'text', value: r.label }),
          }),
          (r) => r.id,
        ),
      }));

      const inp = root.querySelector<HTMLInputElement>('#inp-2')!;
      inp.value = 'partial';
      inp.focus();
      try { inp.setSelectionRange(3, 3); } catch { /* happy-dom may no-op */ }
      expect(document.activeElement).toBe(inp);

      // Reverse: every row moves; the row owning the focused input ends up at
      // a new index. Without explicit focus restoration the move blurs the
      // input on engines whose insertBefore drops focus state.
      rows.value = [rows.value[2], rows.value[1], rows.value[0]];

      const after = root.querySelector<HTMLInputElement>('#inp-2')!;
      expect(after).toBe(inp);
      expect(after.value).toBe('partial');
      expect(document.activeElement).toBe(after);
    });

    it('keeps focus when an unrelated new row is inserted at the top', () => {
      const rows = signal<Row[]>(makeRows(2));
      mount(root, () => jsx('ul', {
        children: each(
          rows.value,
          (r) => jsx('li', {
            'data-key': r.id,
            children: jsx('input', { id: `inp-${r.id}`, type: 'text', value: r.label }),
          }),
          (r) => r.id,
        ),
      }));

      const inp = root.querySelector<HTMLInputElement>('#inp-2')!;
      inp.focus();
      expect(document.activeElement).toBe(inp);

      rows.value = [{ id: 99, label: 'new' }, ...rows.value];

      const after = root.querySelector<HTMLInputElement>('#inp-2')!;
      expect(after).toBe(inp);
      expect(document.activeElement).toBe(after);
    });

    it('drops focus when the focused row itself is removed', () => {
      // Sanity: when the row hosting the focused input disappears (orphan
      // removal), there's no element to restore focus to. The reconciler
      // should leave focus where the engine puts it (typically <body>) and
      // not throw.
      const rows = signal<Row[]>(makeRows(2));
      mount(root, () => jsx('ul', {
        children: each(
          rows.value,
          (r) => jsx('li', {
            'data-key': r.id,
            children: jsx('input', { id: `inp-${r.id}`, type: 'text', value: r.label }),
          }),
          (r) => r.id,
        ),
      }));

      const inp = root.querySelector<HTMLInputElement>('#inp-2')!;
      inp.focus();

      rows.value = rows.value.filter((r) => r.id !== 2);
      expect(root.querySelector('#inp-2')).toBe(null);
      // No assertion on activeElement — it's the engine's call once the
      // focused element is gone. The point is reconcile didn't throw.
    });

    it('keeps focus on a non-text element (button) inside a moved row — no selection branch', () => {
      const rows = signal<Row[]>(makeRows(2));
      mount(root, () => jsx('ul', {
        children: each(
          rows.value,
          (r) => jsx('li', {
            'data-key': r.id,
            children: jsx('button', { id: `btn-${r.id}`, children: r.label }),
          }),
          (r) => r.id,
        ),
      }));

      const btn = root.querySelector<HTMLButtonElement>('#btn-2')!;
      btn.focus();
      expect(document.activeElement).toBe(btn);

      rows.value = [rows.value[1], rows.value[0]];

      const after = root.querySelector<HTMLButtonElement>('#btn-2')!;
      expect(after).toBe(btn);
      expect(document.activeElement).toBe(after);
    });

    it('does not throw if selection APIs reject mid-restore (KF-65)', () => {
      const setSel = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange').mockImplementation(() => {
        throw new Error('selection unsupported');
      });

      const rows = signal<Row[]>(makeRows(2));
      mount(root, () => jsx('ul', {
        children: each(
          rows.value,
          (r) => jsx('li', {
            'data-key': r.id,
            children: jsx('input', { id: `inp-${r.id}`, type: 'text', value: r.label }),
          }),
          (r) => r.id,
        ),
      }));

      const inp = root.querySelector<HTMLInputElement>('#inp-2')!;
      inp.focus();

      expect(() => {
        rows.value = [rows.value[1], rows.value[0]];
      }).not.toThrow();

      setSel.mockRestore();
    });

    it('does not throw if selection capture rejects (e.g. type=number)', () => {
      // selectionStart on a number input throws in some engines. The capture
      // must swallow it and continue without selection state.
      const getSel = vi.spyOn(HTMLInputElement.prototype, 'selectionStart', 'get').mockImplementation(() => {
        throw new Error('selection unavailable');
      });

      const rows = signal<Row[]>(makeRows(2));
      mount(root, () => jsx('ul', {
        children: each(
          rows.value,
          (r) => jsx('li', {
            'data-key': r.id,
            children: jsx('input', { id: `inp-${r.id}`, type: 'text', value: r.label }),
          }),
          (r) => r.id,
        ),
      }));

      const inp = root.querySelector<HTMLInputElement>('#inp-2')!;
      inp.focus();

      expect(() => {
        rows.value = [rows.value[1], rows.value[0]];
      }).not.toThrow();
      expect(document.activeElement).toBe(inp);

      getSel.mockRestore();
    });

    it('skips focus snapshot when the active element is outside the list parent', () => {
      // External focus (an input outside the each() parent) must not be
      // touched by the reconciler — captureFocus returns null and applyMoves
      // proceeds without any focus mutation.
      const external = document.createElement('input');
      external.id = 'external';
      external.type = 'text';
      document.body.appendChild(external);

      const rows = signal<Row[]>(makeRows(2));
      mount(root, () => jsx('ul', {
        children: each(rows.value, (r) => jsx('li', { 'data-key': r.id, children: r.label })),
      }));

      external.focus();
      expect(document.activeElement).toBe(external);

      rows.value = [rows.value[1], rows.value[0]];

      expect(document.activeElement).toBe(external);
      external.remove();
    });

    it('removes nodes that disappeared from the array', () => {
      const rows = signal<Row[]>(makeRows(3));
      mount(root, () => jsx('ul', {
        children: each(rows.value, (r) => jsx('li', { children: r.label, 'data-key': r.id })),
      }));
      rows.value = [rows.value[0], rows.value[2]];
      const after = Array.from(root.querySelectorAll('li'));
      expect(after.length).toBe(2);
      expect(after.map((el) => el.textContent)).toEqual(['r1', 'r3']);
    });

    it('inserts brand-new rows', () => {
      const rows = signal<Row[]>(makeRows(2));
      mount(root, () => jsx('ul', {
        children: each(rows.value, (r) => jsx('li', { children: r.label, 'data-key': r.id })),
      }));
      const before = Array.from(root.querySelectorAll('li'));
      rows.value = [...rows.value, { id: 3, label: 'r3' }];
      const after = Array.from(root.querySelectorAll('li'));
      expect(after.length).toBe(3);
      expect(after[0]).toBe(before[0]);
      expect(after[1]).toBe(before[1]);
      expect(after[2].textContent).toBe('r3');
    });

    it('clears the list when given an empty array', () => {
      const rows = signal<Row[]>(makeRows(3));
      mount(root, () => jsx('ul', {
        children: each(rows.value, (r) => jsx('li', { children: r.label, 'data-key': r.id })),
      }));
      rows.value = [];
      expect(root.querySelectorAll('li').length).toBe(0);
    });

    it('uses key() to invalidate one row when external state flips', () => {
      const rows = signal<Row[]>(makeRows(3));
      const selected = signal<number>(-1);
      mount(root, () => jsx('ul', {
        children: each(
          rows.value,
          (r) => jsx('li', {
            children: r.label,
            'data-key': r.id,
            class: r.id === selected.value ? 'on' : '',
          }),
          (r) => r.id === selected.value ? 1 : 0,
        ),
      }));
      const before = Array.from(root.querySelectorAll('li'));
      selected.value = 2;
      const after = Array.from(root.querySelectorAll('li'));
      // Rows 1 and 3 kept their nodes (key didn't flip for them).
      expect(after[0]).toBe(before[0]);
      expect(after[2]).toBe(before[2]);
      // Row 2's class flipped. With the snapshot in-place fast path, the row
      // is updated on its existing node (same refs in same order → no node
      // swap), so identity is preserved while the class reflects new state.
      expect(after[1].getAttribute('class')).toBe('on');
      expect(after[1]).toBe(before[1]);
    });

    it('replaces the whole list when every item is a new object', () => {
      const rows = signal<Row[]>(makeRows(3));
      mount(root, () => jsx('ul', {
        children: each(rows.value, (r) => jsx('li', { children: r.label, 'data-key': r.id })),
      }));
      const before = Array.from(root.querySelectorAll('li'));
      // New keys entirely.
      rows.value = [
        { id: 10, label: 'x' },
        { id: 11, label: 'y' },
        { id: 12, label: 'z' },
      ];
      const after = Array.from(root.querySelectorAll('li'));
      expect(after.length).toBe(3);
      expect(after.map((el) => el.textContent)).toEqual(['x', 'y', 'z']);
      // None of the original nodes are present any more.
      for (const old of before) expect(old.parentElement).toBe(null);
    });

    it('throws if a row render produces no top-level element', () => {
      const rows = signal<Row[]>([{ id: 1, label: 'r1' }]);
      expect(() => mount(root, () => jsx('ul', {
        children: each(rows.value, () => raw('')),
      }))).toThrow(/each\(\): row render at index 0 produced no top-level element/);
    });
  });

  it('outside mount(), each() falls back to a flattened SafeHtml without binding', () => {
    const list = each([{ id: 1 }, { id: 2 }], (r) => raw(`<li data-key="${r.id}">${r.id}</li>`));
    expect(list.toString()).toBe('<li data-key="1">1</li><li data-key="2">2</li>');
  });

  it('accepts a SafeHtml with only __html (cross-bundle shim) as the render result', () => {
    // Simulate a SafeHtml from a separately-bundled copy that doesn't carry
    // a __segment (older kerf, or one that escaped the brand check). mount()
    // should treat it as static and render the html.
    const BRAND = Symbol.for('kerfjs.SafeHtml');
    const shim = {
      __html: '<p>shim</p>',
      [BRAND]: true,
      toString(): string { return this.__html; },
    };
    mount(root, () => shim as unknown as Parameters<typeof mount>[1] extends () => infer R ? R : never);
    expect(root.innerHTML).toBe('<p>shim</p>');
  });

  it('non-kerf comment nodes in the rendered output are left alone', () => {
    interface Row { id: number }
    const rows = signal<Row[]>([{ id: 1 }, { id: 2 }]);
    mount(root, () => jsx('ul', {
      children: [
        raw('<!-- a user-supplied note -->'),
        each(rows.value, (r) => jsx('li', { children: String(r.id), 'data-key': r.id })),
      ],
    }));
    // The user's comment survives both first render and re-render.
    expect(root.innerHTML).toContain('a user-supplied note');
    rows.value = [...rows.value, { id: 3 }];
    expect(root.innerHTML).toContain('a user-supplied note');
    expect(root.querySelectorAll('li').length).toBe(3);
  });

  it('skips reconcile for a list that was not bound during the first render', () => {
    // Lists are only bound on the first render. A list that only appears in
    // later renders (conditional rendering) gets handled by morphdom's normal
    // path until the next first-render, since each()'s position counter
    // assigns it an unbound id.
    const showList = signal(false);
    const items = signal<Array<{ id: number }>>([{ id: 1 }]);
    mount(root, () => {
      if (!showList.value) return jsx('div', { children: 'no list yet' });
      return jsx('ul', {
        children: each(items.value, (r) => jsx('li', { children: String(r.id), 'data-key': r.id })),
      });
    });
    expect(root.innerHTML).toBe('<div>no list yet</div>');
    showList.value = true;
    // morphdom rebuilds the static surrounds and inlines the list items —
    // they show up but go through morphdom rather than the native reconciler.
    expect(root.querySelector('ul')).not.toBe(null);
    expect(root.querySelectorAll('li').length).toBe(1);
  });

  it('handles non-element siblings (text/comment) between marker and items on first render', () => {
    interface Row { id: number }
    const rows = signal<Row[]>([{ id: 1 }, { id: 2 }]);
    mount(root, () => jsx('ul', {
      // Inject a stray comment alongside the list inside the parent. After
      // innerHTML the marker comment is followed by another comment, then by
      // the list elements — the binding walker should skip past non-element
      // siblings to find the list rows.
      children: [
        raw('<!-- stray -->'),
        each(rows.value, (r) => jsx('li', { children: String(r.id), 'data-key': r.id })),
      ],
    }));
    expect(root.querySelectorAll('li').length).toBe(2);
    // Trigger a re-render to confirm the binding survived the stray comment.
    rows.value = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(root.querySelectorAll('li').length).toBe(3);
  });
});

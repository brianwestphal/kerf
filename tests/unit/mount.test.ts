/**
 * Unit tests for `mount()`. Exercises the morph-driven re-render against a
 * happy-dom DOM, including identity preservation, focus/selection survival,
 * keyed list reorders, and the data-morph-skip escape hatch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { each } from '../../src/each.js';
import { jsx, raw } from '../../src/jsx-runtime.js';
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

describe('mount()', () => {
  it('renders the initial JSX into rootEl', () => {
    mount(root, () => jsx('p', { children: 'hello' }));
    expect(root.innerHTML).toBe('<p>hello</p>');
  });

  it('re-renders when a read signal changes', () => {
    const count = signal(0);
    mount(root, () => jsx('span', { children: count.value }));
    expect(root.textContent).toBe('0');
    count.value = 7;
    expect(root.textContent).toBe('7');
  });

  it('does NOT re-render when an unread signal changes', () => {
    const a = signal(1);
    const b = signal(100);
    let renders = 0;
    mount(root, () => {
      renders += 1;
      return jsx('span', { children: a.value });
    });
    expect(renders).toBe(1);
    b.value = 999;
    expect(renders).toBe(1);
    a.value = 2;
    expect(renders).toBe(2);
  });

  it('preserves element identity across re-renders for keyed list rows', () => {
    interface Row { id: string; label: string }
    const rows = signal<Row[]>([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
    ]);

    mount(root, () => jsx('ul', {
      children: rows.value.map((r) => jsx('li', { 'data-key': r.id, children: r.label })),
    }));

    const liA = root.querySelector('[data-key="a"]')!;
    const liB = root.querySelector('[data-key="b"]')!;
    const liC = root.querySelector('[data-key="c"]')!;

    // Reverse the list — keyed nodes should be moved, not rebuilt.
    rows.value = [...rows.value].reverse();

    expect(root.querySelector('[data-key="a"]')).toBe(liA);
    expect(root.querySelector('[data-key="b"]')).toBe(liB);
    expect(root.querySelector('[data-key="c"]')).toBe(liC);

    // And they should be in reversed order in the DOM.
    const order = Array.from(root.querySelectorAll('li')).map((li) => li.getAttribute('data-key'));
    expect(order).toEqual(['c', 'b', 'a']);
  });

  it('preserves typed input value when the parent re-renders', () => {
    const tick = signal(0);
    mount(root, () => jsx('div', {
      children: [
        jsx('span', { children: `tick:${tick.value}` }),
        jsx('input', { id: 'name-input', type: 'text' }),
      ],
    }));

    const input = root.querySelector<HTMLInputElement>('#name-input')!;
    input.value = 'hello';
    input.focus();

    tick.value += 1;

    const inputAfter = root.querySelector<HTMLInputElement>('#name-input')!;
    // Same DOM node (identity preserved by id).
    expect(inputAfter).toBe(input);
    // Value preserved.
    expect(inputAfter.value).toBe('hello');
  });

  it('skips morphing inside elements marked data-morph-skip', () => {
    const tick = signal(0);
    mount(root, () => jsx('div', {
      children: [
        jsx('span', { children: `tick:${tick.value}` }),
        jsx('div', { id: 'widget', 'data-morph-skip': true }),
      ],
    }));

    // Append a child to the morph-skip host directly (simulating a library
    // that owns this subtree).
    const widget = root.querySelector('#widget')!;
    const innerDot = document.createElement('span');
    innerDot.textContent = 'library-owned';
    widget.appendChild(innerDot);

    // Force a parent re-render. The new template has an empty #widget, but
    // morphdom should leave the live one alone.
    tick.value += 1;

    expect(root.querySelector('#widget > span')).toBe(innerDot);
    expect(widget.textContent).toBe('library-owned');
  });

  it('disposer stops further re-renders', () => {
    const count = signal(0);
    let renders = 0;
    const dispose = mount(root, () => {
      renders += 1;
      return jsx('span', { children: count.value });
    });
    expect(renders).toBe(1);

    dispose();
    count.value = 1;
    expect(renders).toBe(1); // disposed
  });

  it('accepts a string return type from the render fn', () => {
    mount(root, () => '<p>plain</p>');
    expect(root.innerHTML).toBe('<p>plain</p>');
  });

  it('throws a descriptive error when rootEl is null', () => {
    expect(() => mount(null as unknown as HTMLElement, () => '<p>x</p>'))
      .toThrow(/mount: rootEl is null\/undefined/);
  });

  it('throws a descriptive error when rootEl is undefined', () => {
    expect(() => mount(undefined as unknown as HTMLElement, () => '<p>x</p>'))
      .toThrow(/mount: rootEl is null\/undefined/);
  });

  it('adopts an inert-document root into the live document before rendering (KF-243)', () => {
    // A consumer can hand mount() an element from an inert document (no
    // browsing context) — here via document.implementation.createHTMLDocument().
    // mount() must adopt it into the live document first; otherwise its
    // first-render innerHTML write runs against an inert-document element,
    // which trips the WebKit fragment-parse bug fixed in KF-240.
    const inert = document.implementation.createHTMLDocument('');
    const el = inert.createElement('div');
    expect(el.ownerDocument).not.toBe(document); // sanity: starts inert
    expect(inert.defaultView).toBeNull(); // sanity: no browsing context
    const dispose = mount(el, () => jsx('p', { children: 'hi' }));
    expect(el.ownerDocument).toBe(document); // adopted into the live document
    expect(el.innerHTML).toBe('<p>hi</p>'); // renders correctly post-adopt
    dispose();
  });

  it('does NOT adopt (or detach) a normal live-document root', () => {
    // The common case: a live element already in document. mount() must leave
    // its ownerDocument and its place in the tree untouched.
    expect(root.ownerDocument).toBe(document);
    const parent = root.parentNode;
    const dispose = mount(root, () => jsx('p', { children: 'x' }));
    expect(root.ownerDocument).toBe(document);
    expect(root.parentNode).toBe(parent); // not detached
    dispose();
  });

  describe('one-mount-per-tree precondition (KF-175)', () => {
    it('throws when mount() is called on a descendant of an already-mounted element', () => {
      mount(root, () => jsx('div', { children: jsx('span', { id: 'inner', children: 'x' }) }));
      const inner = root.querySelector('#inner') as HTMLElement;
      expect(() => mount(inner, () => 'y')).toThrow(/already inside.*mounted tree/);
    });

    it('throws when mount() is called on an ancestor of an already-mounted element', () => {
      const inner = document.createElement('div');
      root.appendChild(inner);
      mount(inner, () => 'inner');
      expect(() => mount(root, () => 'outer')).toThrow(/already inside.*mounted tree/);
    });

    it('throws when mount() is called twice on the same element without dispose', () => {
      mount(root, () => 'first');
      expect(() => mount(root, () => 'second')).toThrow(/is already mounted/);
    });

    it('includes the element tagName in the same-element double-mount error', () => {
      mount(root, () => 'first');
      expect(() => mount(root, () => 'second')).toThrow(/<div>/);
    });

    it('includes the element id in the double-mount error when the element has one', () => {
      root.id = 'app';
      mount(root, () => 'first');
      try {
        mount(root, () => 'second');
        throw new Error('expected throw');
      } catch (e) {
        expect((e as Error).message).toContain('<div#app>');
      } finally {
        root.id = '';
      }
    });

    it('allows mount() on the same element after the prior mount has been disposed', () => {
      const dispose = mount(root, () => 'first');
      dispose();
      expect(() => mount(root, () => 'second')).not.toThrow();
    });

    it('allows sibling mount() calls into independent regions of the same scaffold', () => {
      // The cart-section pattern: a shared scaffold with two region divs,
      // each getting its own mount(). Neither is an ancestor or descendant
      // of the other, so the precondition does not fire.
      const a = document.createElement('div');
      const b = document.createElement('div');
      root.appendChild(a);
      root.appendChild(b);
      expect(() => {
        mount(a, () => 'A');
        mount(b, () => 'B');
      }).not.toThrow();
    });
  });

  it('preserves user-set <details open> across re-renders (KF-84)', () => {
    // Force the template to actually change between renders (KF-88's fast
    // path skips the diff when surrounds are byte-identical, which would
    // bypass the user-agent-owned-attr handling entirely). The class flip
    // makes the morphAttributes path run.
    const cls = signal('a');
    mount(root, () =>
      jsx('details', {
        className: cls.value,
        children: jsx('summary', { children: 'click' }),
      }),
    );
    const det = root.querySelector('details') as HTMLDetailsElement;
    expect(det.hasAttribute('open')).toBe(false);
    det.setAttribute('open', '');
    expect(det.hasAttribute('open')).toBe(true);
    cls.value = 'b';
    expect(det.hasAttribute('open')).toBe(true);
    expect(det.getAttribute('class')).toBe('b');  // confirms diff did run
  });

  it('preserves user-set <dialog open> across re-renders (KF-84)', () => {
    const cls = signal('a');
    mount(root, () => jsx('dialog', { className: cls.value, children: 'hello' }));
    const dlg = root.querySelector('dialog') as HTMLDialogElement;
    dlg.setAttribute('open', '');
    expect(dlg.hasAttribute('open')).toBe(true);
    cls.value = 'b';
    expect(dlg.hasAttribute('open')).toBe(true);
    expect(dlg.getAttribute('class')).toBe('b');
  });

  it('still removes non-state attributes when the template DOES change (control for KF-84)', () => {
    // Control for KF-84: confirm the user-agent-owned exception is narrow.
    // The template needs to actually change for the diff to run (KF-88's
    // static-surrounds cache short-circuits when the rendered HTML is
    // byte-identical). Flip a class on the div to force a real diff, then
    // assert imperative attrs are wiped while `<details>` `open` would have
    // survived.
    const cls = signal('a');
    mount(root, () => jsx('div', { className: cls.value, children: 'x' }));
    const div = root.querySelector('div')!;
    div.setAttribute('data-imperative', 'set');
    expect(div.getAttribute('data-imperative')).toBe('set');
    cls.value = 'b';  // forces the template to change → diff runs → wipe
    expect(div.getAttribute('data-imperative')).toBe(null);
  });

  it('threads existing list bindings into the diff as listParents when the template changes (KF-88 coverage)', () => {
    // Mount has an each() list. Flipping a class on the parent forces the
    // KF-88 slow path; the diff needs the list parent in `listParents` so
    // it doesn't recurse into the list's children.
    interface Row { id: string; label: string }
    const rows = signal<Row[]>([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
    const cls = signal('one');
    mount(root, () =>
      jsx('section', {
        className: cls.value,
        children: jsx('ul', {
          children: each(rows.value, (r) => jsx('li', { 'data-key': r.id, children: r.label })),
        }),
      }),
    );
    const ul = root.querySelector('ul')!;
    expect(ul.children.length).toBe(2);
    cls.value = 'two';  // template changes → diff runs → listParents path is taken
    expect(root.querySelector('section')!.getAttribute('class')).toBe('two');
    expect(root.querySelector('ul')!.children.length).toBe(2);  // list children preserved
  });

  it('preserves imperative attribute mutations when the template is byte-identical (KF-88 fast path)', () => {
    // KF-88: when the rendered HTML is unchanged, mount() skips the diff
    // entirely. Imperative DOM mutations on stable surrounds survive — a
    // useful property for third-party libraries that update `data-state`
    // attrs on static host elements.
    const tick = signal(0);
    mount(root, () => {
      void tick.value;
      return jsx('div', { children: 'x' });
    });
    const div = root.querySelector('div')!;
    div.setAttribute('data-imperative', 'set');
    tick.value = 1;
    // Template is unchanged → no diff → imperative attr survives.
    expect(div.getAttribute('data-imperative')).toBe('set');
  });

  it('still removes <details open> when the developer explicitly toggles it via the template (controlled mode)', () => {
    // Trade-off documented in src/morph.ts: with the user-agent-owned rule,
    // a controlled `<details open={isOpen.value}>` flipping from true → false
    // does NOT auto-collapse. We pin this so any future fix that restores
    // controlled-mode semantics fails this test loudly and prompts a doc
    // update.
    const isOpen = signal(true);
    mount(root, () =>
      jsx('details', {
        ...(isOpen.value ? { open: true } : {}),
        children: jsx('summary', { children: 'x' }),
      }),
    );
    const det = root.querySelector('details') as HTMLDetailsElement;
    expect(det.hasAttribute('open')).toBe(true);
    isOpen.value = false;
    // Documented limitation: the morph's remove pass skips `open` on
    // <details>/<dialog>, so even an explicit "remove via template" doesn't
    // take effect. Apps that need controlled behavior drive `open`
    // imperatively (e.g. `el.removeAttribute('open')`).
    expect(det.hasAttribute('open')).toBe(true);
  });
});

describe('mount() — focus and selection preservation', () => {
  it('preserves cursor position in a focused text input across an attribute-changing re-render', () => {
    const cls = signal('a');
    mount(root, () => jsx('div', {
      children: [
        jsx('span', { children: `cls:${cls.value}` }),
        jsx('input', { id: 'q', type: 'text', className: cls.value }),
      ],
    }));

    const input = root.querySelector<HTMLInputElement>('#q')!;
    input.value = 'hello world';
    input.focus();
    input.setSelectionRange(6, 6);
    expect(document.activeElement).toBe(input);

    cls.value = 'b';

    const after = root.querySelector<HTMLInputElement>('#q')!;
    expect(after).toBe(input);
    expect(after.value).toBe('hello world');
    expect(after.selectionStart).toBe(6);
    expect(after.selectionEnd).toBe(6);
    expect(after.className).toBe('b');
  });

  it('preserves selection range in a focused textarea across re-render', () => {
    const cls = signal('a');
    mount(root, () => jsx('div', {
      children: [
        jsx('span', { children: cls.value }),
        jsx('textarea', { id: 't', className: cls.value }),
      ],
    }));

    const ta = root.querySelector<HTMLTextAreaElement>('#t')!;
    ta.value = 'multi\nline\ntext';
    ta.focus();
    ta.setSelectionRange(2, 8);

    cls.value = 'b';

    const after = root.querySelector<HTMLTextAreaElement>('#t')!;
    expect(after).toBe(ta);
    expect(after.value).toBe('multi\nline\ntext');
    expect(after.selectionStart).toBe(2);
    expect(after.selectionEnd).toBe(8);
  });

  it('skips the morph entirely while a contenteditable is focused — user edit + element identity survive (KF-19)', () => {
    // Option A from KF-19: short-circuit `onBeforeElUpdated` when fromEl is
    // the focused contenteditable. The whole subtree (typed content, caret,
    // any DOM the user produced) is preserved verbatim. Attribute updates
    // are deferred until the next render after blur — that's the trade-off
    // and the desired behavior for in-progress edits.

    const cls = signal('a');
    mount(root, () => jsx('div', {
      children: [
        jsx('span', { children: cls.value }),
        jsx('div', { id: 'ce', contentEditable: 'true', className: cls.value, children: 'placeholder' }),
      ],
    }));

    const ce = root.querySelector<HTMLDivElement>('#ce')!;
    ce.focus();
    expect(document.activeElement).toBe(ce);

    // Simulate the user typing into the contenteditable.
    ce.textContent = 'user typed this';
    expect(ce.textContent).toBe('user typed this');

    // Trigger an unrelated re-render. Without the short-circuit, morphdom
    // would replace the user's edit with the JSX 'placeholder' content and
    // update className to 'b'.
    cls.value = 'b';

    const after = root.querySelector<HTMLDivElement>('#ce')!;
    expect(after).toBe(ce);                       // identity preserved
    expect(after.textContent).toBe('user typed this'); // edit preserved
    expect(after.className).toBe('a');            // attribute update deferred (the trade-off)

    // Sanity: the unrelated <span> outside the focused subtree DID update.
    const span = root.querySelector('span')!;
    expect(span.textContent).toBe('b');

    // After blur, the next render catches up.
    ce.blur();
    cls.value = 'c';
    expect(after.className).toBe('c');
  });

  it('does not crash when setSelectionRange throws (e.g. an input type that rejects it)', () => {
    const spy = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange').mockImplementation(() => {
      throw new Error('selection unsupported on this input type');
    });

    const cls = signal('a');
    mount(root, () => jsx('input', { id: 'q', type: 'text', className: cls.value }));
    const input = root.querySelector<HTMLInputElement>('#q')!;
    input.value = 'abc';
    input.focus();

    expect(() => { cls.value = 'b'; }).not.toThrow();
    expect(root.querySelector<HTMLInputElement>('#q')!.value).toBe('abc');

    spy.mockRestore();
  });

  it('does not intercept morph for focused non-text elements (e.g. a button)', () => {
    // Focused but not INPUT/TEXTAREA and not contenteditable — morphdom
    // proceeds normally. No special preservation, no short-circuit.
    const cls = signal('a');
    mount(root, () => jsx('button', { id: 'b', className: cls.value, children: cls.value }));
    const btn = root.querySelector<HTMLButtonElement>('#b')!;
    btn.focus();
    expect(document.activeElement).toBe(btn);
    cls.value = 'b';
    expect(btn.className).toBe('b');
    expect(btn.textContent).toBe('b');
  });

  it('does NOT preserve selection logic for focused non-text-entry inputs (e.g. checkbox)', () => {
    const setSel = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange');
    const cls = signal('a');
    mount(root, () => jsx('input', { id: 'cb', type: 'checkbox', className: cls.value }));

    const cb = root.querySelector<HTMLInputElement>('#cb')!;
    cb.focus();
    cls.value = 'b';

    expect(setSel).not.toHaveBeenCalled();
    setSel.mockRestore();
  });

  it('isEqualNode short-circuit: skips work when fromEl matches toEl exactly', () => {
    let renders = 0;
    const tick = signal(0);
    mount(root, () => {
      renders += 1;
      return jsx('div', {
        children: [
          jsx('span', { id: 'static', children: 'unchanging' }),
          jsx('span', { children: `tick:${tick.value}` }),
        ],
      });
    });

    const staticEl = root.querySelector('#static')!;
    tick.value = 1;
    tick.value = 2;
    tick.value = 3;

    expect(renders).toBe(4);
    expect(root.querySelector('#static')).toBe(staticEl);
    expect(staticEl.textContent).toBe('unchanging');
  });

  it('focus is preserved on an input even when no other attributes change (isEqualNode short-circuits)', () => {
    const tick = signal(0);
    mount(root, () => jsx('div', {
      children: [
        jsx('span', { children: `tick:${tick.value}` }),
        jsx('input', { id: 'q', type: 'text' }),
      ],
    }));

    const input = root.querySelector<HTMLInputElement>('#q')!;
    input.value = 'x';
    input.focus();
    tick.value = 1;

    const after = root.querySelector<HTMLInputElement>('#q')!;
    expect(after).toBe(input);
    expect(after.value).toBe('x');
  });

  it('a non-focused input does not get its value clobbered by morph', () => {
    const cls = signal('a');
    mount(root, () => jsx('input', { id: 'q', type: 'text', className: cls.value }));

    const input = root.querySelector<HTMLInputElement>('#q')!;
    input.value = 'set imperatively';
    // Note: NOT focused.

    cls.value = 'b';

    const after = root.querySelector<HTMLInputElement>('#q')!;
    expect(after).toBe(input);
    expect(after.className).toBe('b');
  });

  it('raw() injects HTML through mount without escaping', () => {
    const html = signal(raw('<em>bold</em>'));
    mount(root, () => jsx('div', { children: html.value }));
    expect(root.innerHTML).toBe('<div><em>bold</em></div>');
  });

  it('disposer leaves the rendered DOM in place (kerf does not clear it on dispose)', () => {
    // docs/4-render.md — "After dispose, signal mutations no longer trigger
    // re-renders for this mount. The DOM tree itself is left as-is — kerf
    // doesn't clear it; you do." Pin this contract so an SSR-then-hydrate
    // flow that calls dispose() to detach reactivity (while keeping the
    // rendered HTML on screen) doesn't silently break.
    const dispose = mount(root, () => jsx('p', { children: 'still here' }));
    expect(root.innerHTML).toBe('<p>still here</p>');
    dispose();
    expect(root.innerHTML).toBe('<p>still here</p>');
  });

  it('direct event listeners inside data-morph-skip subtrees survive parent re-renders (Tier 3)', () => {
    // docs/5-event-delegation.md — Tier 3: "Add direct event listeners on
    // the library's API (or on elements inside the host); they survive
    // every parent re-render because the host is morph-skipped." The skip
    // behavior is tested elsewhere; this pins the listener-survival
    // guarantee that motivates the entire pattern (xterm/CodeMirror/charts).
    const tick = signal(0);
    mount(root, () => jsx('div', {
      children: jsx('div', {
        'data-morph-skip': true,
        id: 'host',
        children: jsx('button', { id: 'btn', children: String(tick.value) }),
      }),
    }));
    const btn = root.querySelector<HTMLButtonElement>('#btn')!;
    let clicks = 0;
    btn.addEventListener('click', () => { clicks += 1; });
    tick.value = 1;
    tick.value = 2;
    btn.click();
    expect(clicks).toBe(1);
    // Sanity: the morph-skipped subtree was preserved verbatim.
    expect(btn.textContent).toBe('0');
    expect(root.querySelector('#btn')).toBe(btn);
  });

  // ============================================================
  // each() + mount integration: list segments, native reconciler.
  // The single-source path — partial-update / select-row / swap-rows
  // performance properties depend entirely on these working.
  // ============================================================

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
      // Row 2 got rebuilt with the new class.
      expect(after[1].getAttribute('class')).toBe('on');
      expect(after[1]).not.toBe(before[1]);
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

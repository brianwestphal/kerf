/**
 * Unit tests for `mount()`. Exercises the morph-driven re-render against a
 * happy-dom DOM, including identity preservation, focus/selection survival,
 * keyed list reorders, and the data-morph-skip escape hatch.
 */

import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
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

  it('throws a descriptive error when an each() is INTRODUCED inside a data-morph-skip subtree on a re-render (marker never reaches the live DOM)', () => {
    const showList = signal(false);
    const items = [{ id: 'a' }, { id: 'b' }];
    mount(root, () => jsx('div', {
      'data-morph-skip': true,
      children: showList.value
        ? each(items, (i) => jsx('li', { 'data-key': i.id, children: i.id }))
        : jsx('span', { children: 'no list yet' }),
    }) as never);

    // The morph refuses to write into the skipped subtree, so the new list's
    // marker never lands in the live DOM — kerf must fail loudly, not with a
    // bare TypeError from reconcileList(undefined, …).
    expect(() => { showList.value = true; })
      .toThrow(/each\(\) list appeared in the render output.*data-morph-skip/s);
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

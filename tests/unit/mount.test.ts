/**
 * Unit tests for `mount()`. Exercises the morph-driven re-render against a
 * happy-dom DOM, including identity preservation, focus/selection survival,
 * keyed list reorders, and the data-morph-skip escape hatch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('keeps a focused contenteditable element alive across re-render', () => {
    const cls = signal('a');
    mount(root, () => jsx('div', {
      children: [
        jsx('span', { children: cls.value }),
        jsx('div', { id: 'ce', contentEditable: 'true', className: cls.value, children: 'edit me' }),
      ],
    }));

    const ce = root.querySelector<HTMLElement>('#ce')!;
    ce.focus();
    expect(document.activeElement).toBe(ce);

    cls.value = 'b';

    const after = root.querySelector<HTMLElement>('#ce')!;
    expect(after).toBe(ce);
    expect(after.className).toBe('b');
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
    // behaviour is tested elsewhere; this pins the listener-survival
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
});

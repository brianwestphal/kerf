/**
 * Unit tests for `mount()`. Exercises the morph-driven re-render against a
 * happy-dom DOM, including identity preservation, focus/selection survival,
 * keyed list reorders, and the data-morph-skip escape hatch.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
});

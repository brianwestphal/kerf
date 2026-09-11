import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

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
    ce.textContent = 'user typed this';
    expect(ce.textContent).toBe('user typed this');
    cls.value = 'b';

    const after = root.querySelector<HTMLDivElement>('#ce')!;
    expect(after).toBe(ce);
    expect(after.textContent).toBe('user typed this');
    expect(after.className).toBe('a');
    expect(root.querySelector('span')!.textContent).toBe('b');

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
    cls.value = 'b';

    const after = root.querySelector<HTMLInputElement>('#q')!;
    expect(after).toBe(input);
    expect(after.className).toBe('b');
  });
});

/**
 * Unit tests for fine-grained signal bindings (KF-294 spike).
 *
 * The headline property: a signal handed straight into an attribute or text
 * hole updates the live DOM WITHOUT re-running the render function — the coarse
 * mount() effect never subscribed to it. These tests pin that (render is spied
 * and must stay at one call across binding-driven updates), plus SSR/toString
 * snapshot fallback, teardown, and survival across a coarse (morph) re-render.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { computed, signal } from '../../src/reactive.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
});

describe('fine-grained bindings — text holes', () => {
  it('updates a bound text node without re-running render', () => {
    const count = signal(0);
    const render = vi.fn(() => jsx('div', { id: 'box', children: count }));
    const dispose = mount(root, render);

    const box = root.querySelector('#box') as HTMLElement;
    expect(box.textContent).toBe('0');
    expect(render).toHaveBeenCalledTimes(1);

    count.value = 42;
    expect(box.textContent).toBe('42');
    // The whole point: no re-render, same DOM node.
    expect(render).toHaveBeenCalledTimes(1);
    expect(root.querySelector('#box')).toBe(box);

    dispose();
  });

  it('renders a bound signal among static text siblings', () => {
    const name = signal('world');
    const dispose = mount(root, () =>
      jsx('p', { id: 'p', children: ['hi, ', name, '!'] }),
    );
    const p = root.querySelector('#p') as HTMLElement;
    expect(p.textContent).toBe('hi, world!');
    name.value = 'kerf';
    expect(p.textContent).toBe('hi, kerf!');
    dispose();
  });

  it('a computed text hole tracks its dependencies fine-grained', () => {
    const n = signal(2);
    const doubled = computed(() => n.value * 2);
    const render = vi.fn(() => jsx('span', { id: 's', children: doubled }));
    const dispose = mount(root, render);
    expect((root.querySelector('#s') as HTMLElement).textContent).toBe('4');
    n.value = 5;
    expect((root.querySelector('#s') as HTMLElement).textContent).toBe('10');
    expect(render).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('nullish / boolean bound text renders nothing', () => {
    const v = signal<unknown>(null);
    const dispose = mount(root, () => jsx('div', { id: 'd', children: v }));
    const d = root.querySelector('#d') as HTMLElement;
    expect(d.textContent).toBe('');
    v.value = true;
    expect(d.textContent).toBe('');
    v.value = 'now';
    expect(d.textContent).toBe('now');
    dispose();
  });
});

describe('fine-grained bindings — attribute holes', () => {
  it('updates a bound class without re-running render', () => {
    const cls = signal('danger');
    const render = vi.fn(() =>
      jsx('div', { id: 'row', class: cls, children: 'x' }),
    );
    const dispose = mount(root, render);

    const rowEl = root.querySelector('#row') as HTMLElement;
    expect(rowEl.getAttribute('class')).toBe('danger');
    expect(render).toHaveBeenCalledTimes(1);

    cls.value = '';
    expect(rowEl.getAttribute('class')).toBe('');
    cls.value = 'active';
    expect(rowEl.getAttribute('class')).toBe('active');
    expect(render).toHaveBeenCalledTimes(1);
    expect(root.querySelector('#row')).toBe(rowEl);

    dispose();
  });

  it('keeps the marker attribute but not the bound attribute name in JSX', () => {
    const cls = signal('a');
    const dispose = mount(root, () => jsx('div', { id: 'm', class: cls }));
    const el = root.querySelector('#m') as HTMLElement;
    // The element carries the binding marker and the resolved class.
    expect(el.hasAttribute('data-kfb')).toBe(true);
    expect(el.getAttribute('class')).toBe('a');
    dispose();
  });

  it('boolean / nullish bound attributes toggle presence', () => {
    const disabled = signal<unknown>(true);
    const dispose = mount(root, () =>
      jsx('button', { id: 'b', disabled, children: 'ok' }),
    );
    const b = root.querySelector('#b') as HTMLElement;
    expect(b.hasAttribute('disabled')).toBe(true);
    disabled.value = false;
    expect(b.hasAttribute('disabled')).toBe(false);
    disabled.value = null;
    expect(b.hasAttribute('disabled')).toBe(false);
    disabled.value = true;
    expect(b.hasAttribute('disabled')).toBe(true);
    dispose();
  });

  it('mixes static and bound attributes on one element', () => {
    const cls = signal('sel');
    const dispose = mount(root, () =>
      jsx('div', { id: 'x', 'data-role': 'row', class: cls }),
    );
    const el = root.querySelector('#x') as HTMLElement;
    expect(el.getAttribute('data-role')).toBe('row');
    expect(el.getAttribute('class')).toBe('sel');
    cls.value = 'sel active';
    expect(el.getAttribute('class')).toBe('sel active');
    dispose();
  });
});

describe('fine-grained bindings — SSR / toString fallback', () => {
  it('snapshots a signal text child to its current value with no marker', () => {
    const s = signal('hello');
    const html = jsx('div', { children: s }).toString();
    expect(html).toBe('<div>hello</div>');
    expect(html).not.toContain('kfb');
  });

  it('snapshots a signal attribute to its current value with no marker', () => {
    const s = signal('warn');
    const html = jsx('div', { class: s, children: 'x' }).toString();
    expect(html).toBe('<div class="warn">x</div>');
    expect(html).not.toContain('data-kfb');
  });

  it('escapes a snapshotted text value', () => {
    const s = signal('<script>');
    expect(jsx('div', { children: s }).toString()).toBe('<div>&lt;script&gt;</div>');
  });

  it('snapshots a nullish / boolean signal text child to empty', () => {
    expect(jsx('div', { children: signal(null) }).toString()).toBe('<div></div>');
    expect(jsx('div', { children: signal(true) }).toString()).toBe('<div></div>');
  });
});

describe('fine-grained bindings — lifecycle', () => {
  it('stops updating after dispose', () => {
    const s = signal('a');
    const dispose = mount(root, () => jsx('div', { id: 'd', children: s }));
    const d = root.querySelector('#d') as HTMLElement;
    expect(d.textContent).toBe('a');
    dispose();
    s.value = 'b';
    // Detached + effect torn down: the old node must not update.
    expect(d.textContent).toBe('a');
  });

  it('survives a coarse re-render that rebuilds the surrounds', () => {
    // `show` drives a structural change (morph runs); `label` is a bound hole.
    const show = signal(true);
    const label = signal('one');
    const render = vi.fn(() =>
      jsx('div', {
        id: 'wrap',
        children: show.value
          ? jsx('span', { id: 's', class: label, children: label })
          : jsx('span', { id: 's', class: label, children: label, 'data-alt': 'y' }),
      }),
    );
    const dispose = mount(root, render);

    let s = root.querySelector('#s') as HTMLElement;
    expect(s.textContent).toBe('one');
    expect(s.getAttribute('class')).toBe('one');

    // Coarse re-render: `show` flip changes the surrounds → morph runs.
    show.value = false;
    expect(render).toHaveBeenCalledTimes(2);
    s = root.querySelector('#s') as HTMLElement;
    // Bound attr + text re-applied against the post-morph DOM.
    expect(s.textContent).toBe('one');
    expect(s.getAttribute('class')).toBe('one');

    // And the binding is still live after the re-wire.
    label.value = 'two';
    expect(s.textContent).toBe('two');
    expect(s.getAttribute('class')).toBe('two');
    expect(render).toHaveBeenCalledTimes(2);

    dispose();
  });
});

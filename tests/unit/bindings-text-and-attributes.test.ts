/**
 * Unit tests for fine-grained signal bindings (KF-294 spike).
 *
 * The headline property: a signal handed straight into an attribute or text
 * hole updates the live DOM WITHOUT re-running the render function — the coarse
 * mount() effect never subscribed to it. These tests pin that (render is spied
 * and must stay at one call across binding-driven updates), plus SSR/toString
 * snapshot fallback, teardown, and survival across a coarse (morph) re-render.
 */

import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { computed,signal } from '../../src/reactive.js';

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

// KF-340: the URL screen throws in dev (fail loudly at the developer's desk),
// warns + drops in prod (never crash a shipped app on attacker-influenced data).
// These bound-writer tests run with the dev hooks installed and assert the
// throw; the prod block below uninstalls them and asserts warn+drop.
describe('fine-grained bindings — on* / malformed-name rejection on the bound path (KF-322)', () => {
  // KF-306 hardened the STATIC renderAttr path; KF-322 closes the same hole on
  // the fine-grained bound path. `jsx('button', { onclick: signal })` used to
  // reach setBoundAttr → el.setAttribute('onclick', …), which installs a LIVE
  // inline handler in a browser — an XSS vector that bypassed the static guard.
  // The shared `assertEmittableAttrName` now rejects the on* NAME (and malformed
  // names) at binding registration, before bindAttr ever records the hole.
  //
  // `onclick`/`onMouseOver`/etc. are not in kerf's JSX types (kerf exposes no
  // inline-handler props), so these bags are cast — the runtime throw is the
  // subject, the type system blocking it earlier is a bonus.
  type AttrBag = Parameters<typeof jsx>[1];

  it('throws when a signal is bound to onclick inside a mount — no handler installed', () => {
    const handler = signal('alert(1)');
    const bag = { id: 'b', onclick: handler, children: 'go' } as unknown as AttrBag;
    expect(() => mount(root, () => jsx('button', bag))).toThrow(/event-handler attribute/);
    // The render threw before registering the binding, so nothing mounted and —
    // critically — no live inline onclick handler was written to the DOM.
    expect(root.querySelector('#b')).toBeNull();
  });

  it('rejects an on* signal attribute case-insensitively (onMouseOver)', () => {
    const sig = signal('x');
    const bag = { onMouseOver: sig, children: 'x' } as unknown as AttrBag;
    expect(() => mount(root, () => jsx('div', bag))).toThrow(/event-handler attribute/);
  });

  it('rejects an on* signal attribute inside an each() row (row-scoped binding path)', () => {
    const sig = signal('alert(1)');
    const items = signal([{ id: 'r1' }]);
    const rowBag = (item: { id: string }) =>
      ({ 'data-key': item.id, onclick: sig, children: item.id }) as unknown as AttrBag;
    expect(() =>
      mount(root, () => jsx('ul', { children: each(items.value, (item) => jsx('li', rowBag(item))) })),
    ).toThrow(/event-handler attribute/);
  });

  it('rejects the on* NAME regardless of the signal\'s current value (value null)', () => {
    // Proves the guard keys on the attribute NAME, not the value: a null-valued
    // signal (which would otherwise emit/write nothing) is still rejected, so
    // the vector can't be smuggled in behind a currently-empty signal.
    const empty = signal<string | null>(null);
    const bag = { onclick: empty, children: 'x' } as unknown as AttrBag;
    expect(() => jsx('button', bag).toString()).toThrow(/event-handler attribute/);
  });

  it('rejects a signal bound to a malformed attribute name', () => {
    // Not injectable on the bound path (setAttribute throws InvalidCharacterError
    // rather than parsing markup), but rejected for one consistent contract.
    const sig = signal('y');
    const bag = { 'x><img src=q onerror=alert(1)>': sig, children: 'z' } as unknown as AttrBag;
    expect(() => jsx('div', bag).toString()).toThrow(/invalid attribute name/);
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

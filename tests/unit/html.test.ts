/**
 * Unit tests for the `kerfjs/html` tagged template (`html\`\``) — the
 * no-build-step authoring path.
 *
 * The headline property: `html\`\`` is a thin front-end over the exact
 * machinery JSX uses, so every hole has IDENTICAL semantics to the
 * equivalent JSX — text escaping, attribute rendering (booleans, SafeHtml,
 * URL screening, `on*` rejection), fine-grained signal bindings under
 * `mount()`, and `each()` list-segment passthrough to the keyed reconciler.
 * Plus the parts JSX doesn't have: the hole contract (tag-name /
 * attribute-name / partial-value / comment holes throw) and the
 * per-call-site parse cache.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each } from '../../src/each.js';
import { _parseCount, html } from '../../src/html.js';
import { jsx, raw } from '../../src/jsx-runtime.js';
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

describe('html`` — text holes share JSX child semantics', () => {
  it('escapes string holes exactly like JSX children', () => {
    const v = '<b>&"bold"</b>';
    expect(html`<p>${v}</p>`.toString()).toBe(jsx('p', { children: v }).toString());
  });

  it('stringifies numbers, skips boolean/nullish, joins arrays — same as JSX', () => {
    const arr = ['a', 1, null, undefined, true, false, 'b'];
    expect(html`<div>${arr}</div>`.toString())
      .toBe(jsx('div', { children: arr }).toString());
    expect(html`<div>${42}</div>`.toString()).toBe('<div>42</div>');
    expect(html`<div>${null}${undefined}${false}${true}</div>`.toString()).toBe('<div></div>');
  });

  it('passes nested html`` and raw() through without re-escaping', () => {
    const inner = html`<em>${'<i>'}</em>`;
    expect(html`<p>${inner}</p>`.toString()).toBe('<p><em>&lt;i&gt;</em></p>');
    expect(html`<p>${raw('<u>raw</u>')}</p>`.toString()).toBe('<p><u>raw</u></p>');
  });

  it('renders an empty template and a hole-only template', () => {
    expect(html``.toString()).toBe('');
    expect(html`${'x'}`.toString()).toBe('x');
  });

  it('leaves a lone "<" that is not a tag in text verbatim (author-written markup)', () => {
    expect(html`<p>a < b, 1 <3 ${'end'}</p>`.toString()).toBe('<p>a < b, 1 <3 end</p>');
  });

  it('passes a doctype and comments through verbatim', () => {
    expect(html`<!doctype html><p>${'x'}</p><!-- note -->${'y'}`.toString())
      .toBe('<!doctype html><p>x</p><!-- note -->y');
  });

  it('throws on DOM-node and unsupported-type holes, same as JSX', () => {
    const el = document.createElement('span');
    expect(() => html`<div>${el as never}</div>`).toThrow(/DOM elements cannot be passed/);
    expect(() => html`<div>${{ a: 1 } as never}</div>`).toThrow(/unsupported child/);
  });
});

describe('html`` — attribute holes share JSX attribute semantics', () => {
  it('quoted, single-quoted, and unquoted holes render identically', () => {
    expect(html`<div class="${'x y'}">a</div>`.toString()).toBe('<div class="x y">a</div>');
    expect(html`<div class='${'x y'}'>a</div>`.toString()).toBe('<div class="x y">a</div>');
    expect(html`<div class=${'x y'}>a</div>`.toString()).toBe('<div class="x y">a</div>');
  });

  it('escapes attribute values exactly like JSX', () => {
    const v = `"quo'ted" <&>`;
    expect(html`<div title="${v}">a</div>`.toString())
      .toBe(jsx('div', { title: v, children: 'a' }).toString());
  });

  it('boolean and nullish values follow HTML boolean-attribute semantics', () => {
    expect(html`<input type="checkbox" checked=${true}>`.toString())
      .toBe('<input type="checkbox" checked>');
    expect(html`<input checked=${false}>`.toString()).toBe('<input>');
    expect(html`<input checked="${null}">`.toString()).toBe('<input>');
    expect(html`<input checked=${undefined}>`.toString()).toBe('<input>');
    expect(html`<input tabindex=${3}>`.toString()).toBe('<input tabindex="3">');
  });

  it('SafeHtml (raw()) attribute values are written verbatim', () => {
    expect(html`<a href="${raw('javascript:bookmarklet()')}">b</a>`.toString())
      .toBe('<a href="javascript:bookmarklet()">b</a>');
  });

  it('applies the dangerous-URL screen (javascript: href dropped + warned)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(html`<a href="${'javascript:alert(1)'}">c</a>`.toString()).toBe('<a>c</a>');
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('rejects on* attribute holes — function, string, and object-less values alike', () => {
    const fn = (): void => {};
    expect(() => html`<button onclick=${fn as never}>x</button>`)
      .toThrow(/inline event handlers/);
    expect(() => html`<button onclick="${'doThing()'}">x</button>`)
      .toThrow(/not allowed/);
  });

  it('rejects a malformed attribute name at render time', () => {
    expect(() => html`<div data-«bad=${'v'}>x</div>`).toThrow(/invalid attribute name/);
  });

  it('throws on unsupported attribute value types, same as JSX', () => {
    expect(() => html`<div title=${{ a: 1 } as never}>x</div>`)
      .toThrow(/unsupported value for attribute/);
  });

  it('does NOT apply camelCase aliases — attribute names are emitted verbatim', () => {
    // Template authors write real HTML names (`class`); a JSX-style
    // `className` passes through untranslated by design.
    expect(html`<div className=${'x'}>a</div>`.toString()).toBe('<div className="x">a</div>');
  });

  it('accepts an unquoted hole as the last thing in a template', () => {
    expect(html`<input value=${'v'}`.toString()).toBe('<input value="v"');
  });
});

describe('html`` — hole contract violations throw', () => {
  it('tag-name holes throw', () => {
    expect(() => html`<${'div' as never}>x</div>`).toThrow(/tag-name holes/);
    expect(() => html`<div>x</${'div' as never}>`).toThrow(/tag-name holes/);
  });

  it('attribute-name holes throw', () => {
    expect(() => html`<div ${'id' as never}="x">y</div>`).toThrow(/complete attribute value/);
    expect(() => html`<div${'x' as never}>y</div>`).toThrow(/complete attribute value/);
  });

  it('partial quoted attribute values throw with composition advice', () => {
    expect(() => html`<div class="a ${'b'}">x</div>`).toThrow(/partial attribute values/);
    expect(() => html`<div class="${'a'}b">x</div>`).toThrow(/partial attribute values/);
    expect(() => html`<div class="${'a'} ${'b'}">x</div>`).toThrow(/partial attribute values/);
  });

  it('partial unquoted attribute values throw', () => {
    expect(() => html`<div class=${'a'}b>x</div>`).toThrow(/partial attribute values/);
    expect(() => html`<div class=${'a'}${'b'}>x</div>`).toThrow(/partial attribute values/);
  });

  it('holes inside HTML comments throw', () => {
    expect(() => html`<!-- ${'x'} -->`).toThrow(/holes inside HTML comments/);
  });

  it('a hole immediately after "<" throws even mid-text', () => {
    expect(() => html`count <${3}</p>`).toThrow(/tag-name holes/);
  });
});

describe('html`` — fine-grained signal bindings under mount()', () => {
  it('binds a text hole: updates without re-running render', () => {
    const count = signal(0);
    const render = vi.fn(() => html`<div id="box">Count: ${count}</div>`);
    const dispose = mount(root, render);

    const box = root.querySelector('#box') as HTMLElement;
    expect(box.textContent).toBe('Count: 0');
    count.value = 42;
    expect(box.textContent).toBe('Count: 42');
    expect(render).toHaveBeenCalledTimes(1);
    expect(root.querySelector('#box')).toBe(box);
    dispose();
  });

  it('binds a quoted attribute hole: updates without re-running render', () => {
    const cls = signal('danger');
    const render = vi.fn(() => html`<div id="row" class="${cls}">x</div>`);
    const dispose = mount(root, render);

    const rowEl = root.querySelector('#row') as HTMLElement;
    expect(rowEl.getAttribute('class')).toBe('danger');
    cls.value = 'active';
    expect(rowEl.getAttribute('class')).toBe('active');
    expect(render).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('binds an unquoted attribute hole the same way', () => {
    const cls = signal('a');
    const dispose = mount(root, () => html`<div id="u" class=${cls}>x</div>`);
    const el = root.querySelector('#u') as HTMLElement;
    expect(el.getAttribute('class')).toBe('a');
    cls.value = 'b';
    expect(el.getAttribute('class')).toBe('b');
    dispose();
  });

  it('groups multiple signal attributes on one element into one marker', () => {
    const cls = signal('c1');
    const title = signal('t1');
    const dispose = mount(root, () =>
      html`<div id="m" class=${cls} data-x="static" title=${title}>x</div>`);
    const el = root.querySelector('#m') as HTMLElement;
    // One data-kfb marker carrying both binding ids, injected at the tag close
    // even though static attributes sit between/after the holes.
    expect((el.getAttribute('data-kfb') as string).split(',')).toHaveLength(2);
    expect(el.getAttribute('data-x')).toBe('static');
    cls.value = 'c2';
    title.value = 't2';
    expect(el.getAttribute('class')).toBe('c2');
    expect(el.getAttribute('title')).toBe('t2');
    dispose();
  });

  it('a quoted ">" inside another attribute does not fool the marker injection', () => {
    const cls = signal('a');
    const dispose = mount(root, () => html`<div id="q" title="a>b" class=${cls}>x</div>`);
    const el = root.querySelector('#q') as HTMLElement;
    expect(el.getAttribute('title')).toBe('a>b');
    cls.value = 'b';
    expect(el.getAttribute('class')).toBe('b');
    dispose();
  });

  it('a computed attribute hole tracks fine-grained', () => {
    const n = signal(1);
    const label = computed(() => `n${n.value}`);
    const render = vi.fn(() => html`<span id="c" data-label="${label}">x</span>`);
    const dispose = mount(root, render);
    const el = root.querySelector('#c') as HTMLElement;
    expect(el.getAttribute('data-label')).toBe('n1');
    n.value = 2;
    expect(el.getAttribute('data-label')).toBe('n2');
    expect(render).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('throws when a signal is bound to an on* attribute inside a mount', () => {
    const sig = signal('doThing()');
    expect(() => mount(root, () => html`<button onclick=${sig}>x</button>`))
      .toThrow(/not allowed/);
  });
});

describe('html`` — each() composition (keyed reconciler owns the rows)', () => {
  it('threads the list segment through mount: unchanged rows keep their nodes', () => {
    const items = signal([{ id: 1, label: 'one' }, { id: 2, label: 'two' }]);
    const dispose = mount(root, () =>
      html`<ul id="l">${each(items.value, (i) => html`<li data-key="${String(i.id)}">${i.label}</li>`)}</ul>`);

    const lis = root.querySelectorAll('li');
    expect(lis).toHaveLength(2);
    expect(lis[0].textContent).toBe('one');
    const [first, second] = [lis[0], lis[1]];

    // Append: same item refs → the keyed reconciler reuses both live nodes.
    items.value = [...items.value, { id: 3, label: 'three' }];
    const after = root.querySelectorAll('li');
    expect(after).toHaveLength(3);
    expect(after[0]).toBe(first);
    expect(after[1]).toBe(second);
    expect(after[2].textContent).toBe('three');
    dispose();
  });

  it('composes with arraySignal: granular append leaves existing rows untouched', () => {
    const rows = arraySignal<{ id: number; label: string }>([{ id: 1, label: 'a' }]);
    const dispose = mount(root, () =>
      html`<ul>${each(rows, (r) => html`<li data-key="${String(r.id)}">${r.label}</li>`)}</ul>`);
    const firstNode = root.querySelector('li') as HTMLElement;
    rows.push({ id: 2, label: 'b' });
    const lis = root.querySelectorAll('li');
    expect(lis).toHaveLength(2);
    expect(lis[0]).toBe(firstNode);
    expect(lis[1].textContent).toBe('b');
    dispose();
  });

  it('binds a signal attribute inside an each() row (row-scoped marker)', () => {
    const selected = signal<number | null>(null);
    const items = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }];
    const render = vi.fn(() =>
      html`<ul>${each(items, (i) =>
        html`<li data-key="${String(i.id)}" class=${computed(() => (selected.value === i.id ? 'sel' : ''))}>${i.label}</li>`)}</ul>`);
    const dispose = mount(root, render);

    const lis = root.querySelectorAll('li');
    expect(lis[0].hasAttribute('data-kfbrow')).toBe(true);
    selected.value = 2;
    expect(lis[1].getAttribute('class')).toBe('sel');
    expect(lis[0].getAttribute('class')).toBe('');
    // Fine-grained: no render re-run, no row rebuild.
    expect(render).toHaveBeenCalledTimes(1);
    expect(root.querySelectorAll('li')[1]).toBe(lis[1]);
    dispose();
  });

  it('a template that is only a list hole renders and reconciles', () => {
    const items = signal([{ id: 1, label: 'x' }]);
    const dispose = mount(root, () =>
      html`${each(items.value, (i) => html`<li data-key="${String(i.id)}">${i.label}</li>`)}`);
    expect(root.querySelectorAll('li')).toHaveLength(1);
    items.value = [...items.value, { id: 2, label: 'y' }];
    expect(root.querySelectorAll('li')).toHaveLength(2);
    dispose();
  });
});

describe('html`` — SSR / toString outside a mount', () => {
  it('snapshots a signal text hole with no marker', () => {
    const count = signal(7);
    const out = html`<div>Count: ${count}</div>`.toString();
    expect(out).toBe('<div>Count: 7</div>');
    expect(out).not.toContain('kfb');
  });

  it('snapshots a signal attribute hole with no marker', () => {
    const cls = signal('active');
    const out = html`<div class="${cls}">x</div>`.toString();
    expect(out).toBe('<div class="active">x</div>');
    expect(out).not.toContain('data-kfb');
  });

  it('snapshots a boolean signal attribute per boolean-attribute semantics', () => {
    const on = signal(true);
    expect(html`<input checked=${on}>`.toString()).toBe('<input checked>');
    on.value = false;
    expect(html`<input checked=${on}>`.toString()).toBe('<input>');
  });
});

describe('html`` — per-call-site parse cache', () => {
  it('parses a call site once across repeated renders', () => {
    const tpl = (v: string): string => html`<i>${v}</i>`.toString();
    const before = _parseCount();
    expect(tpl('a')).toBe('<i>a</i>');
    expect(tpl('b')).toBe('<i>b</i>');
    expect(tpl('c')).toBe('<i>c</i>');
    expect(_parseCount() - before).toBe(1);
  });

  it('distinct call sites parse independently', () => {
    const before = _parseCount();
    html`<b>${'x'}</b>`.toString();
    html`<b>${'x'}</b>`.toString(); // different template literal → different strings array
    expect(_parseCount() - before).toBe(2);
  });

  it('a throwing parse is not cached (the error repeats on every call)', () => {
    const bad = (v: string): string => html`<div class="a ${v}">x</div>`.toString();
    expect(() => bad('b')).toThrow(/partial attribute values/);
    expect(() => bad('b')).toThrow(/partial attribute values/);
  });
});

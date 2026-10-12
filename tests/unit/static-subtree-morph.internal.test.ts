/**
 * Change-scoped morph for list-free re-renders (`src/static-subtree-morph.ts`).
 *
 * Every case is held to the same bar as the full walk: after the scoped morph
 * (or, when it declines, the full `morph()` fallback `mount()` runs), the live
 * tree must serialize exactly like a from-scratch parse of the next HTML. The
 * `scoped` expectation pins WHICH path ran, so a refusal rule that silently
 * stops applying — or starts applying where it isn't safe — fails here.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { each } from '../../src/each.js';
import { jsx, type SafeHtml } from '../../src/jsx-runtime.js';
import { morph } from '../../src/morph.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';
import {
  morphStaticChange,
  scanStatic,
  type StaticScanCache,
} from '../../src/static-subtree-morph.js';

afterEach(() => {
  document.body.innerHTML = '';
});

function freshCache(): StaticScanCache {
  return { html: '', scan: null };
}

/**
 * Paint `prev`, optionally disturb the live tree, run the scoped morph toward
 * `next` (falling back to the full morph when it declines), and require the
 * result to equal a from-scratch parse of `next`. Returns the root.
 */
function run(
  prev: string,
  next: string,
  scoped: boolean,
  opts: { rootTag?: string; disturb?: (root: HTMLElement) => void } = {},
): HTMLElement {
  const tag = opts.rootTag ?? 'div';
  const root = document.createElement(tag);
  document.body.appendChild(root);
  root.innerHTML = prev;
  opts.disturb?.(root);
  const ok = morphStaticChange(root, prev, next, freshCache(), new Set());
  expect(ok).toBe(scoped);
  if (!ok) morph(root, next);
  const fresh = document.createElement(tag);
  fresh.innerHTML = next;
  expect(root.innerHTML).toBe(fresh.innerHTML);
  return root;
}

describe('morphStaticChange — scoped (equivalent to the full walk)', () => {
  it('morphs only the changed row and leaves its siblings untouched', () => {
    const rows = (sel: number): string =>
      `<main><section>${[0, 1, 2]
        .map((i) => `<div class="${i === sel ? 'row on' : 'row'}">r${i}</div>`)
        .join('')}</section></main>`;
    const root = document.createElement('div');
    document.body.appendChild(root);
    root.innerHTML = rows(0);
    const before = Array.from(root.querySelectorAll('.row'));
    expect(
      morphStaticChange(root, rows(0), rows(2), freshCache(), new Set()),
    ).toBe(true);
    const after = Array.from(root.querySelectorAll('.row'));
    expect(after).toEqual(before); // identity kept for every row
    expect(after.map((r) => r.className)).toEqual(['row', 'row', 'row on']);
  });

  it('climbs from a text edit to the element that owns it', () => {
    run(
      '<section><div><span>1</span></div></section>',
      '<section><div><span>22</span></div></section>',
      true,
    );
  });

  it('handles edits among root-level children', () => {
    run('<span>1</span><span>2</span>', '<span>1</span><span>3</span>', true);
  });

  it('reconciles table rows and cells in their own parsing context', () => {
    const table = (v: string): string =>
      `<table><tbody><tr><td>a</td><td>${v}</td></tr><tr><td>b</td></tr></tbody></table>`;
    run(table('1'), table('2'), true);
    run(
      '<table><tbody><tr class="x"><td>1</td></tr><tr><td>2</td></tr></tbody></table>',
      '<table><tbody><tr class="y"><td>1</td></tr><tr><td>2</td></tr></tbody></table>',
      true,
    );
  });

  it('climbs above context-sensitive ancestors (p, li, a, formatting, svg)', () => {
    run(
      '<div><p>hi <b><span>1</span></b></p></div>',
      '<div><p>hi <b><span>2</span></b></p></div>',
      true,
    );
    run(
      '<div><ul><li><a href="/x">1</a></li></ul></div>',
      '<div><ul><li><a href="/y">1</a></li></ul></div>',
      true,
    );
    run(
      '<div><svg><svg></svg><path d="a"/><g><rect width="1"></rect></g></svg></div>',
      '<div><svg><svg></svg><path d="a"/><g><rect width="2"></rect></g></svg></div>',
      true,
    );
    run(
      '<div><svg/><span>1</span></div>',
      '<div><svg/><span>2</span></div>',
      true,
    );
  });

  it('models comments, raw text, void elements, quotes, and literal "<"', () => {
    run(
      `<div><!-- note --><textarea>a <b></textarea><br><img alt='x>y'><i title = "q">a < b</i><span>1</span></div>`,
      `<div><!-- note --><textarea>a <b></textarea><br><img alt='x>y'><i title = "q">a < b</i><span>2</span></div>`,
      true,
    );
    run(
      '<div><textarea>a</textarea></div>',
      '<div><textarea>b</textarea></div>',
      true,
    );
    run(
      '<div><script>if (a <script> b) {}</script><span>1</span></div>',
      '<div><script>if (a <script> b) {}</script><span>2</span></div>',
      true,
    );
  });

  it('accepts uppercase and spaced end tags', () => {
    run('<DIV><span>1</span></DIV >', '<DIV><span>2</span></DIV >', true);
  });

  it('keeps morphing a changed child whose key is unchanged', () => {
    run(
      '<div><span data-key="a">1</span><span id="b">1</span></div>',
      '<div><span data-key="a">2</span><span id="b">2</span></div>',
      true,
    );
  });

  it('reuses the cached scan of the previous string', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    root.innerHTML = '<span>1</span>';
    const cache = freshCache();
    expect(
      morphStaticChange(
        root,
        '<span>1</span>',
        '<span>2</span>',
        cache,
        new Set(),
      ),
    ).toBe(true);
    expect(cache.html).toBe('<span>2</span>');
    expect(cache.scan).not.toBeNull();
    expect(
      morphStaticChange(
        root,
        '<span>2</span>',
        '<span>3</span>',
        cache,
        new Set(),
      ),
    ).toBe(true);
    expect(root.innerHTML).toBe('<span>3</span>');
  });

  it('accepts a table-box mount root with whitespace-only text', () => {
    run('<tr><td>1</td></tr> ', '<tr><td>2</td></tr> ', true, {
      rootTag: 'tbody',
    });
  });
});

describe('morphStaticChange — declines (full walk runs instead)', () => {
  it('when the markup cannot be modeled', () => {
    for (const bad of [
      '<div><span></div>', // mismatched end tag
      '<div>', // unclosed
      '</div>', // stray end tag
      '<div></DIVX>', // mismatched uppercase end tag
      '<div></divx>', // end tag sharing a prefix
      '<!DOCTYPE html><div></div>',
      '<!--> <div></div>',
      '<!---> <div></div>',
      '<!-- a --!> --><div></div>',
      '<!-- unterminated',
      '<noscript></noscript>',
      '<div a"b></div>', // quote outside an attribute value
      '<div a="b></div>', // unterminated quote
      '<div', // no closing '>'
      '</', // end tag without '>'
      '<script>never closed',
      '<svg><g>',
      '<table>x<tbody></tbody></table>', // text foster-parented out of the table
      '<div><td></td></div>', // cell outside a row
      '<table><tbody><div></div></tbody></table>', // element foster-parented
    ]) {
      expect(scanStatic(bad, 'div'), bad).toBeNull();
    }
    expect(scanStatic('<tr></tr>x', 'tbody')).toBeNull();
    run('<div a"b>1</div>', '<div a"b>2</div>', false);
    run('<span>1</span>', '<span>1</span><!DOCTYPE html>', false);
  });

  it('when the edit changes the structure at every level', () => {
    run('<span>1</span>', '<span>1</span><span>2</span>', false);
    run('a', 'b', false); // root-level text
    // The host candidate's close tag moves in the new string.
    run(
      '<section><div></div><div></div></section>',
      '<section><div></div></section><section><div></div></section>',
      false,
    );
    // Same child count but a different tag / different text between children.
    run('<i>1</i><b>1</b>', '<i>1</i><u>1</u>', false);
    run('<i>1</i>x<b>1</b>', '<i>2</i>y<b>1</b>', false);
  });

  it('when the live tree disagrees with the previous string', () => {
    const prev = '<main><div><span>1</span></div></main>';
    const next = '<main><div><span>2</span></div></main>';
    run(prev, next, false, {
      disturb: (r) => r.appendChild(document.createElement('aside')),
    });
    run(prev, next, false, {
      disturb: (r) =>
        r.querySelector('main')!.appendChild(document.createElement('i')),
    });
    run(prev, next, false, {
      disturb: (r) =>
        r.querySelector('main')!.replaceWith(document.createElement('main')),
    });
    run('<div><span>1</span></div>', '<div><span>2</span></div>', false, {
      disturb: (r) =>
        r.querySelector('span')!.replaceWith(document.createElement('em')),
    });
  });

  it('when a path element is morph-skipped or focused', () => {
    const prev = '<main><div tabindex="0"><span>1</span></div></main>';
    const next = '<main><div tabindex="0"><span>2</span></div></main>';
    run(prev, next, false, {
      disturb: (r) =>
        r.querySelector('div')!.setAttribute('data-morph-skip', ''),
    });
    run(prev, next, false, {
      disturb: (r) =>
        r.querySelector('div')!.setAttribute('data-morph-skip-children', ''),
    });
    run(prev, next, false, {
      disturb: (r) => (r.querySelector('div') as HTMLElement).focus(),
    });
  });

  it('when the parser would repair the changed child', () => {
    run('<div><p>a</p></div>', '<div><p><div></div></p></div>', false);
  });

  it('when the full walk would replace rather than morph the changed child', () => {
    run(
      '<div><span data-key="a">1</span></div>',
      '<div><span data-key="b">1</span></div>',
      false,
    );
    run(
      '<div><span>1</span></div>',
      '<div><span data-morph-skip>1</span></div>',
      false,
    );
  });
});

describe('mount(): list-free re-renders through the scoped morph', () => {
  it('reconciles only the changed subtree; imperative state elsewhere survives', () => {
    const sel = signal(0);
    const root = document.createElement('div');
    document.body.appendChild(root);
    mount(root, () =>
      jsx('main', {
        children: [0, 1, 2].map((i) =>
          jsx('div', {
            className: i === sel.value ? 'row on' : 'row',
            children: `r${i}`,
          }),
        ),
      }),
    );
    const [r0, r1, r2] = Array.from(root.querySelectorAll('.row'));
    r0.setAttribute('data-x', '0');
    r1.setAttribute('data-x', '1');
    root.querySelector('main')!.setAttribute('data-x', 'main');
    sel.value = 2;
    expect(Array.from(root.querySelectorAll('.row'))).toEqual([r0, r1, r2]);
    expect(r2.className).toBe('row on');
    // The changed rows are reconciled (non-JSX attribute removed) …
    expect(r0.hasAttribute('data-x')).toBe(false);
    // … while an unchanged sibling and the ancestors keep imperative state.
    expect(r1.getAttribute('data-x')).toBe('1');
    expect(root.querySelector('main')!.getAttribute('data-x')).toBe('main');
  });

  it('keeps fine-grained bindings outside the changed subtree live', () => {
    const label = signal('a');
    const tone = signal('cool');
    const count = signal(0);
    const root = document.createElement('div');
    document.body.appendChild(root);
    mount(root, () =>
      jsx('main', {
        children: [
          jsx('span', { class: tone, children: label }),
          jsx('b', { children: String(count.value) }),
        ],
      }),
    );
    count.value = 1;
    expect(root.querySelector('b')!.textContent).toBe('1');
    label.value = 'b';
    tone.value = 'warm';
    const span = root.querySelector('span')!;
    expect(span.textContent).toBe('b');
    expect(span.className).toBe('warm');
    count.value = 2;
    expect(root.querySelector('b')!.textContent).toBe('2');
    expect(span.textContent).toBe('b');
  });

  it('preserves a focused input inside the changed subtree', () => {
    const n = signal(0);
    const root = document.createElement('div');
    document.body.appendChild(root);
    mount(root, () =>
      jsx('form', {
        children: [
          jsx('div', {
            'data-n': String(n.value),
            children: jsx('input', { value: 'x' }),
          }),
          jsx('p', { children: 'static' }),
        ],
      }),
    );
    const input = root.querySelector('input')!;
    input.focus();
    input.value = 'typed';
    n.value = 1;
    expect(root.querySelector('input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('typed');
  });
});

describe('mount(): keyed each() re-renders through the scoped morph', () => {
  interface Line {
    id: number;
  }
  const lines = (n: number): Line[] =>
    Array.from({ length: n }, (_, id) => ({ id }));

  /** Live markup minus kerf's list markers, which `toString()` never emits. */
  const visible = (root: HTMLElement): string =>
    root.innerHTML.replace(/<!--kf-list:[^>]*-->/g, '');

  function page(
    items: readonly Line[],
    selected: number,
    gridClass = 'grid',
    footer = 'end',
  ): SafeHtml {
    return jsx('main', {
      children: [
        jsx('aside', {
          children: jsx('p', { children: `Line ${selected}` }),
        }),
        jsx('section', {
          children: jsx('div', {
            className: gridClass,
            children: [
              each(
                items,
                (line) =>
                  jsx('div', {
                    'data-key': String(line.id),
                    className: line.id === selected ? 'row on' : 'row',
                    children: `r${line.id}`,
                  }),
                { key: 'lines', cacheKey: (line) => line.id === selected },
              ),
              jsx('footer', { children: footer }),
            ],
          }),
        }),
      ],
    });
  }

  function setup(render: () => SafeHtml): HTMLElement {
    const root = document.createElement('div');
    document.body.appendChild(root);
    mount(root, render);
    return root;
  }

  it('morphs a change beside the list without visiting the rows', () => {
    const data = lines(5);
    const sel = signal(0);
    const root = setup(() => page(data, sel.value));
    const rows = Array.from(root.querySelectorAll('.row'));
    // Imperative state the full walk would strip from kerf-managed elements.
    root.querySelector('section')!.setAttribute('data-x', 'section');
    root.querySelector('footer')!.setAttribute('data-x', 'footer');

    sel.value = 3;

    expect(root.querySelector('p')!.textContent).toBe('Line 3');
    expect(Array.from(root.querySelectorAll('.row'))).toEqual(rows);
    expect(rows.map((r) => r.className)).toEqual([
      'row',
      'row',
      'row',
      'row on',
      'row',
    ]);
    // Only the details pane was morphed; the list's container kept its state.
    expect(root.querySelector('section')!.getAttribute('data-x')).toBe(
      'section',
    );
    expect(root.querySelector('footer')!.getAttribute('data-x')).toBe('footer');
    expect(visible(root).replace(/ data-x="[^"]*"/g, '')).toBe(
      page(data, 3).toString(),
    );
  });

  it('falls back to the full walk for a change in the element holding the rows', () => {
    const data = lines(4);
    const grid = signal('grid');
    const foot = signal('end');
    const root = setup(() => page(data, 1, grid.value, foot.value));
    const rows = Array.from(root.querySelectorAll('.row'));
    root.querySelector('aside')!.setAttribute('data-x', 'aside');

    grid.value = 'grid dense';
    expect(root.querySelector('.grid')!.className).toBe('grid dense');
    // A sibling of the rows: its index among the live children is shifted by
    // the rows, so the scoped morph must decline rather than misplace it.
    foot.value = 'done';
    expect(root.querySelector('footer')!.textContent).toBe('done');

    expect(Array.from(root.querySelectorAll('.row'))).toEqual(rows);
    // The full walk ran: imperative state on an unchanged element is gone.
    expect(root.querySelector('aside')!.hasAttribute('data-x')).toBe(false);
    expect(visible(root)).toBe(page(data, 1, 'grid dense', 'done').toString());
  });

  it('walks empty → filled → changed beside → emptied → refilled', () => {
    const items = signal<Line[]>([]);
    const sel = signal(0);
    const foot = signal('end');
    const root = setup(() => page(items.value, sel.value, 'grid', foot.value));
    const check = (): void =>
      expect(visible(root)).toBe(
        page(items.value, sel.value, 'grid', foot.value).toString(),
      );

    // An empty list adds no live children, so the grid's footer is scoped.
    foot.value = 'empty';
    check();
    items.value = lines(3);
    check();
    const rows = Array.from(root.querySelectorAll('.row'));
    sel.value = 2;
    check();
    expect(Array.from(root.querySelectorAll('.row'))).toEqual(rows);
    foot.value = 'three';
    check();
    items.value = [];
    check();
    sel.value = 1;
    check();
    items.value = lines(2);
    check();
    expect(root.querySelector('footer')!.textContent).toBe('three');
  });

  it('binds a list that appears inside the changed subtree, and drops it again', () => {
    const data = lines(3);
    const extra = lines(2);
    const show = signal(false);
    const sel = signal(0);
    const root = setup(() =>
      jsx('main', {
        children: [
          jsx('aside', {
            children: show.value
              ? jsx('ul', {
                  children: each(
                    extra,
                    (line) =>
                      jsx('li', {
                        'data-key': `x${line.id}`,
                        children: `x${line.id}`,
                      }),
                    { key: 'extra' },
                  ),
                })
              : jsx('p', { children: 'none' }),
          }),
          jsx('section', {
            children: each(
              data,
              (line) =>
                jsx('div', {
                  'data-key': String(line.id),
                  className: line.id === sel.value ? 'row on' : 'row',
                  children: `r${line.id}`,
                }),
              { key: 'lines', cacheKey: (line) => line.id === sel.value },
            ),
          }),
        ],
      }),
    );
    const rows = Array.from(root.querySelectorAll('.row'));
    show.value = true;
    expect(
      Array.from(root.querySelectorAll('li')).map((li) => li.textContent),
    ).toEqual(['x0', 'x1']);
    sel.value = 2;
    expect(root.querySelector('.on')!.textContent).toBe('r2');
    show.value = false;
    expect(root.querySelector('li')).toBeNull();
    expect(root.querySelector('aside p')!.textContent).toBe('none');
    expect(Array.from(root.querySelectorAll('.row'))).toEqual(rows);
  });
});

/**
 * Custom elements reflect their own defaults onto the host (Web Awesome's
 * `wa-button` → `variant="neutral"`, `wa-tag` → `size="m"`, …). The morph and
 * the keyed-list attribute fast path record which attribute names the template
 * rendered on a custom element (`RENDERED_ATTRS` in
 * `src/utils/isUserAgentOwnedAttr.ts`) and only REMOVE an omitted attribute
 * the previous template rendered. Before, every unrelated re-render stripped
 * the reflected default and the element put it straight back — an attribute
 * flip plus a forced component update per host per render.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { morph } from '../../src/morph.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';
import {
  RENDERED_ATTRS,
  type RenderedAttrsHost,
} from '../../src/utils/isUserAgentOwnedAttr.js';

/**
 * A stand-in for a Lit/Web Awesome host: reflects `variant="neutral"` and
 * `size="m"` when absent, and puts either back whenever it is removed.
 */
class ReflectingTag extends HTMLElement {
  static observedAttributes = ['variant', 'size'];
  connectedCallback(): void {
    this.reflectDefaults();
  }
  attributeChangedCallback(): void {
    this.reflectDefaults();
  }
  private reflectDefaults(): void {
    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'neutral');
    if (!this.hasAttribute('size')) this.setAttribute('size', 'm');
  }
}
if (window.customElements.get('reflect-tag') === undefined) {
  window.customElements.define('reflect-tag', ReflectingTag);
}

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  document.body.innerHTML = '';
});

/** Attribute mutations under `root` caused by `run()`. */
function attrMutations(run: () => void): string[] {
  const observer = new MutationObserver(() => {});
  observer.observe(root, { attributes: true, subtree: true });
  run();
  const names = observer
    .takeRecords()
    .map(
      (r) =>
        `${(r.target as Element).tagName.toLowerCase()}@${r.attributeName}`,
    );
  observer.disconnect();
  return names;
}

describe('morph(): a custom element keeps attributes the template never rendered', () => {
  it('keeps a reflected default across repeated re-renders once the record exists', () => {
    root.innerHTML = '<reflect-tag label="a"></reflect-tag>';
    const tag = root.firstElementChild!;
    expect(tag.getAttribute('variant')).toBe('neutral');
    // First sync: no record yet, so the ordinary rule applies once.
    morph(root, '<reflect-tag label="b"></reflect-tag>');
    expect((tag as RenderedAttrsHost)[RENDERED_ATTRS]).toEqual(['label']);
    // Every later re-render touches only what the template changed.
    for (const label of ['c', 'd', 'e']) {
      const mutations = attrMutations(() =>
        morph(root, `<reflect-tag label="${label}"></reflect-tag>`),
      );
      expect(mutations).toEqual(['reflect-tag@label']);
      expect(tag.getAttribute('variant')).toBe('neutral');
      expect(tag.getAttribute('size')).toBe('m');
    }
  });

  it('removes an attribute the previous template rendered and this one omits', () => {
    root.innerHTML = '<my-btn></my-btn>';
    const btn = root.firstElementChild!;
    morph(root, '<my-btn disabled=""></my-btn>');
    expect(btn.hasAttribute('disabled')).toBe(true);
    morph(root, '<my-btn></my-btn>');
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('walks a conditional attribute on → off → on → off with an element-set attribute alongside', () => {
    root.innerHTML = '<my-btn></my-btn>';
    const btn = root.firstElementChild!;
    // Establish the record. (A byte-equal element is skipped before its
    // attributes sync, so the first sync needs a real difference.)
    morph(root, '<my-btn data-r=""></my-btn>');
    btn.setAttribute('data-state', 'idle'); // set by the component itself
    for (const on of [true, false, true, false, false, true]) {
      morph(root, on ? '<my-btn disabled=""></my-btn>' : '<my-btn></my-btn>');
      expect(btn.hasAttribute('disabled')).toBe(on);
      expect(btn.getAttribute('data-state')).toBe('idle');
    }
  });

  it('lets the template take over and then release an element-set attribute', () => {
    root.innerHTML = '<reflect-tag></reflect-tag>';
    const tag = root.firstElementChild!;
    morph(root, '<reflect-tag></reflect-tag>');
    expect(tag.getAttribute('variant')).toBe('neutral');
    morph(root, '<reflect-tag variant="brand"></reflect-tag>');
    expect(tag.getAttribute('variant')).toBe('brand');
    // Template releases it: removed, and the element reflects its default again.
    morph(root, '<reflect-tag></reflect-tag>');
    expect(tag.getAttribute('variant')).toBe('neutral');
    const mutations = attrMutations(() =>
      morph(root, '<reflect-tag data-x="1"></reflect-tag>'),
    );
    expect(mutations).toEqual(['reflect-tag@data-x']);
  });

  it('starts a fresh record for a replacement element after a tag change', () => {
    root.innerHTML = '<my-a></my-a>';
    morph(root, '<my-a disabled=""></my-a>');
    morph(root, '<my-b disabled=""></my-b>');
    const b = root.firstElementChild!;
    expect(b.tagName).toBe('MY-B');
    expect((b as RenderedAttrsHost)[RENDERED_ATTRS]).toBeUndefined();
    b.setAttribute('data-own', '1');
    // First sync of the new element: the ordinary rule.
    morph(root, '<my-b></my-b>');
    expect(b.hasAttribute('disabled')).toBe(false);
    expect(b.hasAttribute('data-own')).toBe(false);
  });

  it('leaves plain elements on the ordinary rule', () => {
    root.innerHTML = '<div class="a"></div>';
    const div = root.firstElementChild!;
    morph(root, '<div class="b"></div>');
    div.setAttribute('data-own', '1');
    morph(root, '<div class="c"></div>');
    expect(div.hasAttribute('data-own')).toBe(false);
    expect((div as RenderedAttrsHost)[RENDERED_ATTRS]).toBeUndefined();
  });
});

describe('mount(): list-free re-renders stop flipping reflected defaults', () => {
  it('a selection change mutates only the selected rows after the first re-render', () => {
    const selected = signal(0);
    const ids = [0, 1, 2, 3, 4];
    mount(root, () =>
      jsx('ul', {
        children: ids.map((id) =>
          jsx('li', {
            'data-selected': selected.value === id ? '' : undefined,
            children: jsx('reflect-tag', { label: `row ${id}` }),
          }),
        ),
      }),
    );
    selected.value = 1; // warm-up: the first sync records each host
    const mutations = attrMutations(() => {
      selected.value = 2;
    });
    expect(mutations.sort()).toEqual(['li@data-selected', 'li@data-selected']);
    for (const tag of root.querySelectorAll('reflect-tag')) {
      expect(tag.getAttribute('variant')).toBe('neutral');
    }
  });
});

describe('keyed list: the attribute fast path and the morph agree', () => {
  it('walks morph → fast-path set → morph omit → morph, never keeping a fast-path attribute', () => {
    const rows = arraySignal<{ id: number; off: boolean; t: string }>([
      { id: 1, off: false, t: 'a' },
    ]);
    mount(root, () =>
      jsx('div', {
        children: each(rows, (row) =>
          jsx('reflect-tag', {
            'data-key': String(row.id),
            disabled: row.off,
            // A child attribute change defeats both fast paths → morph path.
            children: jsx('span', { 'data-t': row.t }),
          }),
        ),
      }),
    );
    const tag = root.querySelector('reflect-tag')! as RenderedAttrsHost;
    // 1. Morph path: establishes the record.
    rows.update(0, (row) => ({ ...row, t: 'b' }));
    expect(tag[RENDERED_ATTRS]).toEqual(['data-key']);
    expect(tag.getAttribute('variant')).toBe('neutral');
    // 2. Attribute-only diff: the fast path sets `disabled` and drops the
    //    record it does not maintain.
    rows.update(0, (row) => ({ ...row, off: true }));
    expect(tag.hasAttribute('disabled')).toBe(true);
    expect(tag[RENDERED_ATTRS]).toBeUndefined();
    // 3. Morph path omitting `disabled`: removed (ordinary rule, no record).
    rows.update(0, (row) => ({ ...row, off: false, t: 'c' }));
    expect(root.querySelector('reflect-tag')).toBe(tag);
    expect(tag.hasAttribute('disabled')).toBe(false);
    expect(tag[RENDERED_ATTRS]).toEqual(['data-key']);
    // 4. From here on the reflected defaults never flip.
    const mutations = attrMutations(() =>
      rows.update(0, (row) => ({ ...row, t: 'd' })),
    );
    expect(mutations).toEqual(['span@data-t']);
    expect(tag.getAttribute('variant')).toBe('neutral');
    expect(tag.getAttribute('size')).toBe('m');
  });
});

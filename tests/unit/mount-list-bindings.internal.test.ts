/**
 * KF-VBQJAX — `bindListsFromMarkers` skips its whole-tree comment walk when the
 * render has no `each()` lists and no live list bindings exist.
 *
 * A large list-free page (one `mount()`, plain `.map()`) used to pay a full DOM
 * traversal after every morph looking for `kf-list:` markers that kerf never
 * emitted. The direct tests pin that the walk is skipped exactly when there is
 * nothing it could find, and still runs whenever a list or a binding exists;
 * the mount tests walk the list-free ↔ list transitions so a list that appears
 * later still binds, and one that leaves still unbinds.
 *
 * `*.internal.test.ts` because it imports the internal module directly, so the
 * dist-full mode skips it.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import type { ListBinding } from '../../src/list-binding.js';
import { mount } from '../../src/mount.js';
import { bindListsFromMarkers } from '../../src/mount-list-bindings.js';
import { signal } from '../../src/reactive.js';
import type { Segment } from '../../src/segment.js';

/** A root whose child walk throws, so any traversal attempt is detectable. */
function unwalkableRoot(): Element {
  const el = document.createElement('div');
  Object.defineProperty(el, 'firstChild', {
    get() {
      throw new Error('walked');
    },
  });
  return el;
}

const STATIC: Segment = { kind: 'static', html: '<p>x</p>' };
const WITH_LIST: Segment = {
  kind: 'mixed',
  parts: [
    { kind: 'static', html: '<ul>' },
    { kind: 'list', id: '0', items: [] },
    { kind: 'static', html: '</ul>' },
  ],
};

describe('bindListsFromMarkers — no-list skip (direct)', () => {
  it('does not walk the tree when there are no lists and no bindings', () => {
    for (const inlined of [true, false]) {
      expect(() =>
        bindListsFromMarkers(unwalkableRoot(), STATIC, new Map(), inlined),
      ).not.toThrow();
    }
  });

  it('still walks when the segment has a list', () => {
    expect(() =>
      bindListsFromMarkers(unwalkableRoot(), WITH_LIST, new Map(), false),
    ).toThrow('walked');
  });

  it('still walks when a binding exists, even with no list this render', () => {
    const bindings = new Map<string, ListBinding>([
      [
        '0',
        {
          liveParent: document.createElement('ul'),
          items: [],
          marker: document.createComment('kf-list:0'),
        },
      ],
    ]);
    expect(() =>
      bindListsFromMarkers(unwalkableRoot(), STATIC, bindings, false),
    ).toThrow('walked');
  });
});

describe('mount() — list-free renders and list transitions', () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('re-renders a list-free page, then binds a list that appears, then drops it', () => {
    const showList = signal(false);
    const label = signal('a');
    const rows = [{ id: 1 }, { id: 2 }];
    const dispose = mount(root, () =>
      jsx('main', {
        children: [
          jsx('h1', { className: label.value, children: label.value }),
          showList.value
            ? jsx('ul', {
                children: each(rows, (r) =>
                  jsx('li', { 'data-key': r.id, children: String(r.id) }),
                ),
              })
            : null,
        ],
      }),
    );
    expect(root.innerHTML).toBe('<main><h1 class="a">a</h1></main>');

    label.value = 'b'; // list-free morph
    expect(root.innerHTML).toBe('<main><h1 class="b">b</h1></main>');

    showList.value = true; // list appears after list-free renders
    expect(root.innerHTML).toBe(
      '<main><h1 class="b">b</h1><ul><!--kf-list:0--><li data-key="1">1</li><li data-key="2">2</li></ul></main>',
    );
    const firstLi = root.querySelector('li');

    label.value = 'c'; // surrounds change while the list is bound: rows kept
    expect(root.querySelector('li')).toBe(firstLi);
    expect(root.querySelector('h1')?.className).toBe('c');

    showList.value = false; // list leaves: marker + rows removed
    expect(root.innerHTML).toBe('<main><h1 class="c">c</h1></main>');

    label.value = 'd'; // and list-free again
    showList.value = true; // empty-then-refill
    expect(root.querySelectorAll('li')).toHaveLength(2);
    expect(root.querySelector('h1')?.className).toBe('d');
    dispose();
  });
});

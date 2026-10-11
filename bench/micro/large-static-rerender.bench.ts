/**
 * KF-VBQJAX — subsequent-render cost on a large, list-free static tree.
 *
 * An app that renders everything from one `mount()` with plain `.map()` (no
 * `each()`) re-renders its whole page on every signal write. The DOM work
 * (template parse + morph) is unavoidable without `each()` or bindings; this
 * bench tracks the per-render core overhead that scales with total static
 * HTML rather than with the changed nodes:
 *
 *   - `render only` — the JSX build (attribute validation, URL screening,
 *     escaping, segment merging) of the ~300-row page, no DOM.
 *   - `render + flatten` — the build plus the static-surrounds flatten and
 *     string compare `mount()` runs before deciding to morph.
 *   - `mount re-render` — a full `mount()` subsequent render where exactly one
 *     row's `class` / `aria-selected` changes (happy-dom parse + morph
 *     included, so absolute numbers are dominated by happy-dom's DOM).
 *
 * Fixture: `large-static-tree.fixture.ts`. Run: `npm run bench:micro`.
 */

import { bench, describe } from 'vitest';

import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';
import { flattenWithoutListItems } from '../../src/segment.js';
import { renderPage } from './large-static-tree.fixture.js';

describe('large static tree (300 rows × ~170 nodes, no each())', () => {
  let flip = 0;

  bench('render only (JSX build of the whole page)', () => {
    renderPage(flip++ % 300);
  });

  bench('render + flatten + compare (pre-morph mount work)', () => {
    const a = renderPage(flip++ % 300);
    const b = renderPage(flip++ % 300);
    if (
      flattenWithoutListItems(a.__segment!) ===
      flattenWithoutListItems(b.__segment!)
    )
      throw new Error('fixture: expected a change');
  });

  {
    const selected = signal(0);
    const root = document.createElement('div');
    document.body.appendChild(root);
    mount(root, () => renderPage(selected.value));
    bench(
      'mount re-render: one row selection flip',
      () => {
        selected.value = (selected.value + 1) % 300;
      },
      { iterations: 20 },
    );
  }
});

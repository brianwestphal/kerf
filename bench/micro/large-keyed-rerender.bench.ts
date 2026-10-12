/**
 * KF-03KWNV — subsequent-render cost of a large page whose rows come from a
 * memoized keyed `each()`.
 *
 * The companion `large-static-rerender.bench.ts` covers the list-free page.
 * Here the 300 rows are `each()` items with a `cacheKey`, so selecting a row
 * re-renders only two rows' JSX, but the details pane's text also changes,
 * so the static surrounds differ and `mount()` must update them:
 *
 *   - `render only` — the JSX build with every unchanged row a memo hit.
 *   - `mount re-render` — a full `mount()` subsequent render (happy-dom parse
 *     + morph + list reconcile).
 *   - `… with a global binding` — the same page inside an element whose
 *     `class` is a fine-grained binding, so every surrounds-changed render
 *     also re-wires the page's global binding markers.
 *
 * Fixture: `large-static-tree.fixture.ts`. Run: `npm run bench:micro`.
 */

import { bench, describe } from 'vitest';

import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';
import { type EachFn, renderKeyedPage } from './large-static-tree.fixture.js';

describe('large keyed page (300 memoized each() rows, surrounds change)', () => {
  {
    const selected = signal(0);
    const root = document.createElement('div');
    document.body.appendChild(root);
    let renders = 0;
    mount(root, () => {
      renders++;
      return renderKeyedPage(selected.value, each as EachFn);
    });
    bench(
      'mount re-render: one row selection flip',
      () => {
        selected.value = (selected.value + 1) % 300;
      },
      { iterations: 50 },
    );
    if (renders === 0) throw new Error('fixture: mount never rendered');
  }

  {
    const selected = signal(0);
    const tone = signal('cool');
    const root = document.createElement('div');
    document.body.appendChild(root);
    mount(root, () =>
      jsx('div', {
        class: tone,
        children: renderKeyedPage(selected.value, each as EachFn),
      }),
    );
    bench(
      'mount re-render with a global binding: one row selection flip',
      () => {
        selected.value = (selected.value + 1) % 300;
      },
      { iterations: 50 },
    );
  }
});

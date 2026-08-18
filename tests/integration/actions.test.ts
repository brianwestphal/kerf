/**
 * Integration: `kerfjs/actions` through the full pipeline — a `mount()` region
 * whose re-render morphs the tree, with `delegateActions` wiring the buttons.
 * The point is the delegation property: one root-level listener keeps firing
 * across re-renders, where a per-element listener would be dropped by the morph.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { action, delegateActions } from '../../src/actions.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('actions — full pipeline', () => {
  it('delegated action handlers keep firing across mount() re-renders (morph)', () => {
    const count = signal(0);
    const root = document.createElement('div');
    document.body.appendChild(root);

    // Reading count.value in the render body makes each click re-render + morph.
    mount(root, () =>
      jsx('div', {
        children: [
          jsx('span', { class: 'count', children: count.value }),
          jsx('button', { ...action('inc').attrs, children: '+' }),
          jsx('button', { ...action('reset').attrs, children: '0' }),
        ],
      }),
    );

    const seen: number[] = [];
    const dispose = delegateActions(root, 'click', {
      inc: () => { seen.push(count.value); count.value++; },
      reset: () => { count.value = 0; },
    });

    const inc = () => (root.querySelector('[data-action="inc"]') as HTMLElement).click();
    const readCount = () => root.querySelector('.count')?.textContent;

    inc();                       // 0 -> 1, tree re-renders
    inc();                       // 1 -> 2, button node survived the morph — still fires
    inc();                       // 2 -> 3
    expect(seen).toEqual([0, 1, 2]);
    expect(readCount()).toBe('3');

    // A second action in the same table, after several morphs, still routes.
    (root.querySelector('[data-action="reset"]') as HTMLElement).click();
    expect(readCount()).toBe('0');

    // Disposer stops the whole table.
    dispose();
    inc();
    expect(seen).toEqual([0, 1, 2]); // unchanged
    expect(readCount()).toBe('0');
  });
});

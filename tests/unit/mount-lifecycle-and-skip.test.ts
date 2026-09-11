/**
 * Unit tests for `mount()`. Exercises the morph-driven re-render against a
 * happy-dom DOM, including identity preservation, focus/selection survival,
 * keyed list reorders, and the data-morph-skip escape hatch.
 */

import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import { jsx,raw } from '../../src/jsx-runtime.js';
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
  it('raw() injects HTML through mount without escaping', () => {
    const html = signal(raw('<em>bold</em>'));
    mount(root, () => jsx('div', { children: html.value }));
    expect(root.innerHTML).toBe('<div><em>bold</em></div>');
  });

  it('disposer leaves the rendered DOM in place (kerf does not clear it on dispose)', () => {
    // docs/4-render.md — "After dispose, signal mutations no longer trigger
    // re-renders for this mount. The DOM tree itself is left as-is — kerf
    // doesn't clear it; you do." Pin this contract so an SSR-then-hydrate
    // flow that calls dispose() to detach reactivity (while keeping the
    // rendered HTML on screen) doesn't silently break.
    const dispose = mount(root, () => jsx('p', { children: 'still here' }));
    expect(root.innerHTML).toBe('<p>still here</p>');
    dispose();
    expect(root.innerHTML).toBe('<p>still here</p>');
  });

  it('direct event listeners inside data-morph-skip subtrees survive parent re-renders (Tier 3)', () => {
    // docs/5-event-delegation.md — Tier 3: "Add direct event listeners on
    // the library's API (or on elements inside the host); they survive
    // every parent re-render because the host is morph-skipped." The skip
    // behavior is tested elsewhere; this pins the listener-survival
    // guarantee that motivates the entire pattern (xterm/CodeMirror/charts).
    const tick = signal(0);
    mount(root, () => jsx('div', {
      children: jsx('div', {
        'data-morph-skip': true,
        id: 'host',
        children: jsx('button', { id: 'btn', children: String(tick.value) }),
      }),
    }));
    const btn = root.querySelector<HTMLButtonElement>('#btn')!;
    let clicks = 0;
    btn.addEventListener('click', () => { clicks += 1; });
    tick.value = 1;
    tick.value = 2;
    btn.click();
    expect(clicks).toBe(1);
    // Sanity: the morph-skipped subtree was preserved verbatim.
    expect(btn.textContent).toBe('0');
    expect(root.querySelector('#btn')).toBe(btn);
  });

  // ============================================================
  // each() + mount integration: list segments, native reconciler.
  // The single-source path — partial-update / select-row / swap-rows
  // performance properties depend entirely on these working.
  // ============================================================


});

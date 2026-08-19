/**
 * Integration: `kerfjs/remount` with a library-owned (`data-morph-skip`) subtree.
 * The whole point of remountOn is that a key change REPLACES the subtree on fresh
 * DOM instead of morphing it — so an imperative widget (here, hand-written DOM +
 * a marker property standing in for highlight.js / a chart) is dropped and the
 * consumer re-initializes on the new node.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { jsx } from '../../src/jsx-runtime.js';
import { signal } from '../../src/reactive.js';
import { remountOn } from '../../src/remount.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('remount — full pipeline', () => {
  it('replaces a library-owned subtree on key change, dropping the old imperative DOM', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const fileId = signal('a');
    const stop = remountOn(parent, fileId, () =>
      jsx('div', { class: 'pane', 'data-morph-skip': '', children: 'placeholder' }),
    );

    // A library imperatively takes over the skipped subtree.
    const pane1 = parent.querySelector('.pane') as HTMLElement;
    pane1.dataset.initialized = 'yes';
    pane1.innerHTML = '<canvas class="chart"></canvas>';
    expect(parent.querySelector('.chart')).not.toBeNull();

    // Switch files → wholesale replacement.
    fileId.value = 'b';
    const pane2 = parent.querySelector('.pane') as HTMLElement;
    expect(pane2).not.toBe(pane1); // fresh node
    expect(pane1.isConnected).toBe(false); // old node (and its imperative DOM) gone
    expect(pane2.dataset.initialized).toBeUndefined(); // consumer must re-init on the fresh node
    expect(parent.querySelectorAll('.chart').length).toBe(0);

    stop();
    expect(parent.querySelector('.pane')).toBeNull();
  });
});

/**
 * Integration: `kerfjs/remount` with a library-owned (`data-morph-skip`) subtree.
 * The whole point of remountOn is that a key change REPLACES the subtree on fresh
 * DOM instead of morphing it — so an imperative widget (here, hand-written DOM +
 * a marker property standing in for highlight.js / a chart) is dropped and the
 * consumer re-initializes on the new node.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { imperative } from '../../src/imperative.js';
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

  it('onMount binds a widget with imperative(); a key change tears the old one down and sets up the new (synchronously, via the returned disposer)', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const fileId = signal('a');
    const events: string[] = [];

    const stop = remountOn(
      parent,
      fileId,
      () => jsx('div', { class: 'pane', 'data-morph-skip': '', children: '' }),
      {
        onMount: (root) => {
          const pane = root.querySelector('.pane') as HTMLElement;
          const at = fileId.value; // capture identity at bind time
          // Returning imperative()'s disposer makes teardown SYNCHRONOUS — remountOn
          // runs it before clearing the DOM, no MutationObserver round trip needed.
          return imperative(pane, (el) => {
            events.push(`setup:${at}`);
            el.innerHTML = '<canvas class="chart"></canvas>';
            return () => events.push(`teardown:${at}`);
          });
        },
      },
    );

    expect(events).toEqual(['setup:a']);

    fileId.value = 'b'; // teardown:a (sync) → replace → setup:b
    expect(events).toEqual(['setup:a', 'teardown:a', 'setup:b']);
    expect(parent.querySelectorAll('.chart').length).toBe(1); // only the fresh widget's DOM

    stop();
    expect(events).toEqual(['setup:a', 'teardown:a', 'setup:b', 'teardown:b']);
    expect(parent.querySelector('.pane')).toBeNull();
  });
});

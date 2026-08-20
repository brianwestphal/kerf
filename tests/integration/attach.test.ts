/**
 * Integration: `kerfjs/attach` bound to a node inside a `mount()` region.
 * When a reconcile removes the node from the DOM, the widget teardown fires via
 * the MutationObserver — the lifecycle guarantee `data-morph-skip` alone can't
 * give (it protects the subtree from morphing, but nothing tears the widget down
 * when the node itself goes away).
 */
import { afterEach, describe, expect, it } from 'vitest';

import { attach } from '../../src/attach.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';

const microtask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('attach — full pipeline', () => {
  it('tears down a library-owned widget when a mount() reconcile removes its node', async () => {
    const app = document.createElement('div');
    document.body.appendChild(app);
    const show = signal(true);
    const events: string[] = [];

    // A keyed swap: show → the '.host' (key a); !show → a different keyed node,
    // so the reconciler removes the host outright (unambiguous removal).
    mount(app, () =>
      show.value
        ? jsx('div', { 'data-key': 'a', class: 'host', 'data-morph-skip': '' })
        : jsx('div', { 'data-key': 'b', class: 'other', children: 'gone' }),
    );

    const hostNode = app.querySelector('.host') as HTMLElement;
    attach(hostNode, (el) => {
      events.push('setup');
      // A library imperatively takes over the skipped host.
      el.innerHTML = '<canvas class="chart"></canvas>';
      return () => events.push('teardown');
    });
    expect(events).toEqual(['setup']);
    expect(app.querySelector('.chart')).not.toBeNull();

    show.value = false; // reconcile removes the host node
    await microtask(); // let the observer deliver
    expect(events).toEqual(['setup', 'teardown']);
    expect(app.querySelector('.host')).toBeNull();
    expect(app.querySelector('.other')?.textContent).toBe('gone');
  });
});

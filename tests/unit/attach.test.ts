import { afterEach, describe, expect, it, vi } from 'vitest';

import { attach } from '../../src/attach.js';

const microtask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = '';
});

function host(): HTMLElement {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const node = document.createElement('div');
  node.className = 'widget';
  parent.appendChild(node);
  return parent;
}

describe('attach()', () => {
  it('runs setup immediately with the node', () => {
    const parent = host();
    const node = parent.querySelector('.widget')!;
    const seen: Element[] = [];
    const stop = attach(node, (el) => { seen.push(el); });
    expect(seen).toEqual([node]);
    stop();
  });

  it('runs teardown when the node is removed directly (via the observer)', async () => {
    const parent = host();
    const node = parent.querySelector('.widget')!;
    const torn: string[] = [];
    attach(node, () => () => torn.push('down'));

    expect(torn).toEqual([]);
    node.remove();
    await microtask();
    expect(torn).toEqual(['down']);
  });

  it('runs teardown when an ANCESTOR is removed (subtree observation)', async () => {
    const parent = host();
    const node = parent.querySelector('.widget')!;
    const torn: string[] = [];
    attach(node, () => () => torn.push('down'));

    parent.remove(); // node itself was never touched, but it's now disconnected
    await microtask();
    expect(torn).toEqual(['down']);
  });

  it('the returned disposer tears down immediately (synchronously) and is idempotent', () => {
    const parent = host();
    const node = parent.querySelector('.widget')!;
    let count = 0;
    const stop = attach(node, () => () => { count++; });

    stop();
    expect(count).toBe(1);
    stop(); // idempotent
    expect(count).toBe(1);
  });

  it('teardown runs at most once — a manual dispose then a removal does not double-fire', async () => {
    const parent = host();
    const node = parent.querySelector('.widget')!;
    let count = 0;
    const stop = attach(node, () => () => { count++; });

    stop();
    node.remove();
    await microtask();
    expect(count).toBe(1);
  });

  it('a mutation elsewhere while the node stays connected does NOT tear down', async () => {
    const parent = host();
    const node = parent.querySelector('.widget')!;
    const torn: string[] = [];
    const stop = attach(node, () => () => torn.push('down'));

    // Add an unrelated sibling — fires the observer, but node.isConnected stays true.
    parent.appendChild(document.createElement('span'));
    await microtask();
    expect(torn).toEqual([]); // still alive
    stop();
  });

  it('a setup that returns no teardown is fine — removal just disconnects the observer', async () => {
    const parent = host();
    const node = parent.querySelector('.widget')!;
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');

    const stop = attach(node, () => { /* no teardown */ });
    node.remove();
    await microtask();
    expect(disconnect).toHaveBeenCalled(); // no throw despite no teardown fn
    stop();
    disconnect.mockRestore();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { attach } from '../../src/attach.js';
import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { bindList } from '../../src/list.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';

const microtask = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));
const frame = (): Promise<void> =>
  new Promise((resolve) => globalThis.requestAnimationFrame(() => resolve()));

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
    const stop = attach(node, (el) => {
      seen.push(el);
    });
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

  it('waits for a disconnected node to connect, then tears down on direct removal', async () => {
    const node = document.createElement('div');
    const events: string[] = [];
    attach(node, () => {
      events.push('setup');
      return () => events.push('teardown');
    });

    document.body.appendChild(document.createElement('aside'));
    await microtask();
    expect(events).toEqual(['setup']);

    document.body.appendChild(node);
    await microtask();
    expect(events).toEqual(['setup']);

    node.remove();
    await microtask();
    expect(events).toEqual(['setup', 'teardown']);
  });

  it('a never-connected node tears down only when explicitly disposed', async () => {
    const node = document.createElement('div');
    const torn: string[] = [];
    const stop = attach(node, () => () => torn.push('down'));

    document.body.appendChild(document.createElement('aside'));
    await microtask();
    expect(torn).toEqual([]);

    stop();
    expect(torn).toEqual(['down']);
  });

  it('explicit disposal cancels a disconnected node connection watch', () => {
    const node = document.createElement('div');
    const request = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockReturnValue(42);
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');

    const stop = attach(node, () => undefined);
    expect(request).toHaveBeenCalledOnce();
    stop();
    expect(cancel).toHaveBeenCalledWith(42);

    request.mockRestore();
    cancel.mockRestore();
  });

  it('follows a disconnected node through ancestor insertion and ancestor removal', async () => {
    const parent = document.createElement('section');
    const node = document.createElement('div');
    parent.appendChild(node);
    const torn: string[] = [];
    attach(node, () => () => torn.push('down'));

    document.body.appendChild(parent);
    await microtask();
    expect(torn).toEqual([]);

    parent.remove();
    await microtask();
    expect(torn).toEqual(['down']);
  });

  it('tears down when a disconnected node is inserted and removed in one observer batch', async () => {
    const parent = document.createElement('section');
    const node = document.createElement('div');
    parent.appendChild(node);
    const torn: string[] = [];
    attach(node, () => () => torn.push('down'));

    document.body.appendChild(parent);
    parent.remove();
    await microtask();
    expect(torn).toEqual(['down']);
  });

  it('follows a connected node into a shadow root before later removal', async () => {
    const node = document.createElement('div');
    document.body.appendChild(node);
    const shadowHost = document.createElement('section');
    const shadow = shadowHost.attachShadow({ mode: 'open' });
    document.body.appendChild(shadowHost);
    const torn: string[] = [];
    attach(node, () => () => torn.push('down'));

    shadow.appendChild(node);
    await microtask();
    expect(torn).toEqual([]);

    node.remove();
    await microtask();
    expect(torn).toEqual(['down']);
  });

  it('follows a disconnected node into a shadow tree, then tears down when the host is removed', async () => {
    const shadowHost = document.createElement('section');
    const shadow = shadowHost.attachShadow({ mode: 'closed' });
    const node = document.createElement('div');
    shadow.appendChild(node);
    const torn: string[] = [];
    attach(node, () => () => torn.push('down'));

    document.body.appendChild(shadowHost);
    await microtask();
    expect(torn).toEqual([]);

    shadowHost.remove();
    await microtask();
    expect(torn).toEqual(['down']);
  });

  it('detects a disconnected node inserted directly into an already-connected shadow root', async () => {
    const shadowHost = document.createElement('section');
    const shadow = shadowHost.attachShadow({ mode: 'closed' });
    document.body.appendChild(shadowHost);
    const node = document.createElement('div');
    const torn: string[] = [];
    attach(node, () => () => torn.push('down'));

    shadow.appendChild(node);
    await frame();
    expect(torn).toEqual([]);

    node.remove();
    await microtask();
    expect(torn).toEqual(['down']);
  });

  it('the returned disposer tears down immediately (synchronously) and is idempotent', () => {
    const parent = host();
    const node = parent.querySelector('.widget')!;
    let count = 0;
    const stop = attach(node, () => () => {
      count++;
    });

    stop();
    expect(count).toBe(1);
    stop(); // idempotent
    expect(count).toBe(1);
  });

  it('teardown runs at most once — a manual dispose then a removal does not double-fire', async () => {
    const parent = host();
    const node = parent.querySelector('.widget')!;
    let count = 0;
    const stop = attach(node, () => () => {
      count++;
    });

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

    const stop = attach(node, () => {
      /* no teardown */
    });
    node.remove();
    await microtask();
    expect(disconnect).toHaveBeenCalled(); // no throw despite no teardown fn
    stop();
    disconnect.mockRestore();
  });
});

describe('attach() — transitions (KF-4EA89E)', () => {
  interface Row {
    id: string;
  }
  const rowsOf = (ids: string[], pool: Map<string, Row>): Row[] =>
    ids.map((id) => {
      if (!pool.has(id)) pool.set(id, { id });
      return pool.get(id)!;
    });

  it('a node inside an each() row survives a keyed reorder (the row is moved, not removed)', async () => {
    const root = document.createElement('ul');
    document.body.appendChild(root);
    const pool = new Map<string, Row>();
    const items = signal(rowsOf(['a', 'b', 'c'], pool));
    const stopMount = mount(root, () =>
      each(
        items.value,
        (row) =>
          jsx('li', {
            'data-key': row.id,
            children: jsx('div', { class: `w-${row.id}` }),
          }),
        (row) => row.id,
      ),
    );
    const widget = root.querySelector('.w-a')!;
    const torn: string[] = [];
    attach(widget, () => () => torn.push('a'));

    items.value = rowsOf(['c', 'b', 'a'], pool); // a moves to the end
    await microtask();
    expect(root.querySelector('.w-a')).toBe(widget); // same node, moved
    expect(widget.isConnected).toBe(true);
    expect(torn).toEqual([]);

    items.value = rowsOf(['a', 'c', 'b'], pool); // and back to the front
    await microtask();
    expect(torn).toEqual([]);

    items.value = rowsOf(['c', 'b'], pool); // a genuinely removed
    await microtask();
    expect(torn).toEqual(['a']);
    stopMount();
  });

  it('a bindList row element survives a keyed reorder and tears down on removal', async () => {
    const parent = document.createElement('ul');
    document.body.appendChild(parent);
    const pool = new Map<string, Row>();
    const items = signal(rowsOf(['a', 'b', 'c'], pool));
    const dispose = bindList(parent, items, {
      key: (row) => row.id,
      render: (row) => row.id,
      tag: 'li',
    });
    const rowA = parent.firstElementChild!;
    const torn: string[] = [];
    attach(rowA, () => () => torn.push('a'));

    items.value = rowsOf(['b', 'c', 'a'], pool);
    await microtask();
    expect(parent.lastElementChild).toBe(rowA);
    expect(torn).toEqual([]);

    items.value = rowsOf(['b', 'c'], pool);
    await microtask();
    expect(torn).toEqual(['a']);
    dispose();
  });

  it('remove, then re-insert in a later task: the widget stays dead (no second setup, no second teardown)', async () => {
    const parent = host();
    const node = parent.querySelector('.widget')!;
    const calls: string[] = [];
    attach(node, () => {
      calls.push('setup');
      return () => calls.push('teardown');
    });
    node.remove();
    await microtask();
    expect(calls).toEqual(['setup', 'teardown']);

    parent.appendChild(node); // a later task re-inserts the same node
    await microtask();
    await frame();
    node.remove();
    await microtask();
    expect(calls).toEqual(['setup', 'teardown']); // attach() again to revive it
  });
});

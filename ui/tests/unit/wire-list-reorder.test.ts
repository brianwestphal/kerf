import { raw } from 'kerfjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { List } from '../../src/components/collections/list/list.js';
import { ListActionRow } from '../../src/components/collections/list-action-row/list-action-row.js';
import {
  ListItem,
  ListItemLink,
} from '../../src/components/collections/list-item/list-item.js';
import {
  type ListReorder,
  reorderListItems,
  wireListReorder,
} from '../../src/wiring/wire-list-reorder.js';

const roots: HTMLElement[] = [];
let originalScrollIntoView: typeof Element.prototype.scrollIntoView;

beforeEach(() => {
  originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  for (const root of roots.splice(0)) root.remove();
});

function mountHtml(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  roots.push(root);
  return root;
}

function items(selected: readonly string[] = [], listId = 'commands') {
  return String(
    List({
      rootAttributes: { 'data-list-id': listId },
      children: ['one', 'two', 'three', 'four'].map((id) =>
        ListItem({
          action: 'select',
          itemId: id,
          label: id,
          draggable: true,
          pressed: selected.includes(id),
        }),
      ),
    }),
  );
}

function row(root: ParentNode, id: string) {
  return root.querySelector<HTMLElement>(`[data-item-id="${id}"]`)!;
}

function at(element: HTMLElement, top: number, height = 40) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ top, height, bottom: top + height, left: 0, right: 200 }),
  });
}

function drag(type: string, target: HTMLElement, clientY = 0) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const transfer = {
    effectAllowed: 'none',
    dropEffect: 'none',
    data: new Map<string, string>(),
    setData(kind: string, value: string) {
      this.data.set(kind, value);
    },
  };
  Object.defineProperty(event, 'dataTransfer', { value: transfer });
  Object.defineProperty(event, 'clientY', { value: clientY });
  target.dispatchEvent(event);
  return { event, transfer };
}

function key(target: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    altKey: true,
    shiftKey: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('reorderListItems', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const id = (value: string) => value;

  it('moves one row before or after a target', () => {
    expect(
      reorderListItems(ids, id, ['a'], { id: 'c', position: 'after' }),
    ).toEqual(['b', 'c', 'a', 'd', 'e']);
    expect(
      reorderListItems(ids, id, ['e'], { id: 'b', position: 'before' }),
    ).toEqual(['a', 'e', 'b', 'c', 'd']);
  });

  it('keeps several moved rows together in their current order', () => {
    expect(
      reorderListItems(ids, id, ['d', 'a'], { id: 'e', position: 'after' }),
    ).toEqual(['b', 'c', 'e', 'a', 'd']);
  });

  it('leaves the order unchanged for a moving, unknown, or empty move', () => {
    expect(
      reorderListItems(ids, id, ['a', 'b'], { id: 'b', position: 'after' }),
    ).toEqual(ids);
    expect(
      reorderListItems(ids, id, ['a'], { id: 'z', position: 'after' }),
    ).toEqual(ids);
    expect(
      reorderListItems(ids, id, ['z'], { id: 'a', position: 'after' }),
    ).toEqual(ids);
  });
});

describe('wireListReorder pointer drag', () => {
  it('paints dragging and drop-position state and reports the drop', () => {
    const root = mountHtml(items());
    const changes: ListReorder[] = [];
    const dispose = wireListReorder(root, {
      onReorder: (change) => changes.push(change),
    });
    const source = row(root, 'one');
    const target = row(root, 'three');
    at(target, 100);

    const { transfer } = drag('dragstart', source);
    expect(source.dataset.dragging).toBe('true');
    expect(transfer.effectAllowed).toBe('move');
    expect(transfer.data.get('application/x-kerf-list-items')).toBe('one');

    const over = drag('dragover', target, 110);
    expect(over.event.defaultPrevented).toBe(true);
    expect(over.transfer.dropEffect).toBe('move');
    expect(target.dataset.dropPosition).toBe('before');
    drag('dragover', target, 130);
    expect(target.dataset.dropPosition).toBe('after');

    const drop = drag('drop', target, 130);
    expect(drop.event.defaultPrevented).toBe(true);
    expect(changes).toEqual([
      {
        listId: 'commands',
        sourceIds: ['one'],
        target: { id: 'three', position: 'after' },
        source: 'pointer',
      },
    ]);
    expect(root.querySelector('[data-dragging], [data-drop-position]')).toBe(
      null,
    );
    dispose();
  });

  it('drags every selected row when the dragged row is selected', () => {
    const root = mountHtml(items(['two', 'four']));
    const onReorder = vi.fn();
    wireListReorder(root, { onReorder });
    drag('dragstart', row(root, 'four'));
    expect(
      [...root.querySelectorAll<HTMLElement>('[data-dragging="true"]')].map(
        (element) => element.dataset.itemId,
      ),
    ).toEqual(['two', 'four']);
    // A dragged row is never a drop target.
    const over = drag('dragover', row(root, 'two'), 0);
    expect(over.event.defaultPrevented).toBe(false);
    expect(row(root, 'two').dataset.dropPosition).toBeUndefined();
    at(row(root, 'one'), 0);
    drag('drop', row(root, 'one'), 5);
    expect(onReorder).toHaveBeenCalledWith({
      listId: 'commands',
      sourceIds: ['two', 'four'],
      target: { id: 'one', position: 'before' },
      source: 'pointer',
    });
  });

  it('moves an unselected row alone even while others are selected', () => {
    const root = mountHtml(items(['two']));
    wireListReorder(root, { onReorder: vi.fn() });
    drag('dragstart', row(root, 'three'));
    expect(row(root, 'three').dataset.dragging).toBe('true');
    expect(row(root, 'two').dataset.dragging).toBeUndefined();
  });

  it('ignores rows that are not draggable, other lists, and stray drags', () => {
    const root = mountHtml(
      items([], 'first') +
        items([], 'second') +
        String(ListItem({ action: 'x', itemId: 'fixed', label: 'Fixed' })),
    );
    const onReorder = vi.fn();
    wireListReorder(root, { onReorder });
    const first = root.querySelectorAll('[data-component="list"]')[0]!;
    const second = root.querySelectorAll('[data-component="list"]')[1]!;

    // Not draggable: no drag state.
    drag('dragstart', row(root, 'fixed'));
    expect(root.querySelector('[data-dragging]')).toBe(null);
    // A dragover with no drag in progress is left alone.
    expect(drag('dragover', row(first, 'two')).event.defaultPrevented).toBe(
      false,
    );

    drag('dragstart', row(first, 'one'));
    const otherList = row(second, 'two');
    expect(drag('dragover', otherList).event.defaultPrevented).toBe(false);
    expect(otherList.dataset.dropPosition).toBeUndefined();
    drag('drop', otherList);
    expect(onReorder).not.toHaveBeenCalled();
    expect(root.querySelector('[data-dragging]')).toBe(null);

    drag('dragstart', row(first, 'one'));
    drag('dragend', row(first, 'one'));
    expect(root.querySelector('[data-dragging]')).toBe(null);
  });

  it('clears a stale insertion line when the pointer leaves for a non-target', () => {
    const root = mountHtml(items());
    wireListReorder(root, { onReorder: vi.fn() });
    drag('dragstart', row(root, 'one'));
    drag('dragover', row(root, 'three'));
    expect(row(root, 'three').dataset.dropPosition).toBeDefined();
    drag('dragover', row(root, 'one'));
    expect(root.querySelector('[data-drop-position]')).toBe(null);
  });

  it('omits listId when the list has none and supports ListItemLink and ListActionRow', () => {
    const root = mountHtml(
      String(
        List({
          children: [
            ListItemLink({
              href: '#a',
              itemId: 'a',
              label: 'A',
              draggable: true,
            }),
            ListActionRow({
              action: 'select',
              itemId: 'b',
              label: 'B',
              draggable: true,
              trailingAction: 'more',
              trailingActionLabel: 'More',
              trailingActionIcon: raw('<svg></svg>'),
            }),
          ],
        }),
      ),
    );
    const onReorder = vi.fn();
    wireListReorder(root, { onReorder });
    drag('dragstart', row(root, 'a'));
    const target = root.querySelector<HTMLElement>(
      '[data-component="list-action-row"]',
    )!;
    drag('drop', target);
    expect(onReorder).toHaveBeenCalledWith({
      sourceIds: ['a'],
      target: { id: 'b', position: 'after' },
      source: 'pointer',
    });
  });
});

describe('wireListReorder keyboard', () => {
  it('moves a row with Alt+Shift+Arrow and refocuses it after the controlled render', async () => {
    const root = mountHtml(items());
    const changes: ListReorder[] = [];
    wireListReorder(root, {
      onReorder: (change) => {
        changes.push(change);
        // A controlled re-render replaces every row element.
        root.innerHTML = items();
      },
    });
    const event = key(row(root, 'two'), 'ArrowDown');
    expect(event.defaultPrevented).toBe(true);
    expect(changes.at(-1)).toEqual({
      listId: 'commands',
      sourceIds: ['two'],
      target: { id: 'three', position: 'after' },
      source: 'keyboard',
    });
    await Promise.resolve();
    expect(document.activeElement).toBe(row(root, 'two'));

    key(row(root, 'two'), 'ArrowUp');
    expect(changes.at(-1)?.target).toEqual({ id: 'one', position: 'before' });
  });

  it('moves a selection past its outer neighbor and stops at the list edge', () => {
    const root = mountHtml(items(['two', 'three']));
    const onReorder = vi.fn();
    wireListReorder(root, { onReorder });
    key(row(root, 'two'), 'ArrowDown');
    expect(onReorder).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sourceIds: ['two', 'three'],
        target: { id: 'four', position: 'after' },
      }),
    );
    onReorder.mockClear();
    const edge = key(row(root, 'one'), 'ArrowUp');
    expect(edge.defaultPrevented).toBe(false);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('ignores other keys, missing modifiers, and rows that are not draggable', () => {
    const root = mountHtml(
      items() +
        String(ListItem({ action: 'x', itemId: 'fixed', label: 'Fixed' })),
    );
    const onReorder = vi.fn();
    wireListReorder(root, { onReorder });
    key(row(root, 'two'), 'ArrowLeft');
    key(row(root, 'two'), 'ArrowDown', { altKey: false });
    key(row(root, 'two'), 'ArrowDown', { metaKey: true });
    key(row(root, 'fixed'), 'ArrowDown');
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('focuses a ListActionRow primary button after a keyboard move', async () => {
    const actionRow = (id: string) =>
      ListActionRow({
        action: 'select',
        itemId: id,
        label: id,
        draggable: true,
        trailingAction: 'more',
        trailingActionLabel: `More ${id}`,
        trailingActionIcon: raw('<svg></svg>'),
      });
    const root = mountHtml(
      String(List({ children: [actionRow('a'), actionRow('b')] })),
    );
    const onReorder = vi.fn();
    wireListReorder(root, { onReorder });
    const primary = row(root, 'a').querySelector<HTMLElement>(
      '.kui-list-action-row__primary',
    )!;
    key(primary, 'ArrowDown');
    expect(onReorder).toHaveBeenCalledWith({
      sourceIds: ['a'],
      target: { id: 'b', position: 'after' },
      source: 'keyboard',
    });
    await Promise.resolve();
    expect(document.activeElement).toBe(primary);
  });

  it('stops refocusing and clears drag state once disposed', async () => {
    const root = mountHtml(items());
    const dispose = wireListReorder(root, { onReorder: vi.fn() });
    drag('dragstart', row(root, 'one'));
    key(row(root, 'two'), 'ArrowDown');
    dispose();
    expect(root.querySelector('[data-dragging]')).toBe(null);
    await Promise.resolve();
    expect(document.activeElement).not.toBe(row(root, 'two'));
    drag('dragstart', row(root, 'one'));
    expect(root.querySelector('[data-dragging]')).toBe(null);
  });
});

describe('wireListReorder unkeyed controlled render', () => {
  it.each([
    ['synchronous', (render: () => void) => render()],
    [
      'after the microtask',
      (render: () => void) =>
        void Promise.resolve().then(() => globalThis.queueMicrotask(render)),
    ],
  ])('refocuses the moved row when the render is %s', async (_, schedule) => {
    const root = mountHtml(items());
    const rows = ['one', 'two', 'three', 'four'];
    wireListReorder(root, {
      onReorder: ({ sourceIds, target }) => {
        const next = reorderListItems(rows, (id) => id, sourceIds, target);
        // An unkeyed render morphs the rows in place, so each element now
        // holds the row at its index (the focused element changes identity).
        schedule(() =>
          root
            .querySelectorAll<HTMLElement>('[data-component="list-item"]')
            .forEach((element, index) => {
              element.dataset.itemId = next[index]!;
            }),
        );
      },
    });
    const moved = row(root, 'four');
    moved.focus();
    key(moved, 'ArrowUp');
    await new Promise((resolve) => globalThis.requestAnimationFrame(resolve));
    await new Promise((resolve) => globalThis.setTimeout(resolve, 20));
    expect((document.activeElement as HTMLElement).dataset.itemId).toBe('four');
    expect(document.activeElement).not.toBe(moved);
  });
});

describe('wireListReorder edge cases', () => {
  it('ignores events outside rows and rows without a container', () => {
    const onReorder = vi.fn();
    const dispose = wireListReorder(document, { onReorder });
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        altKey: true,
        shiftKey: true,
      }),
    );
    const root = mountHtml(items());
    drag('dragstart', root);
    expect(root.querySelector('[data-dragging]')).toBe(null);
    dispose();

    const detached = document.createElement('div');
    detached.innerHTML = String(
      ListItem({
        action: 'a',
        itemId: 'alone',
        label: 'Alone',
        draggable: true,
      }),
    );
    const alone = detached.firstElementChild as HTMLElement;
    alone.remove();
    const stop = wireListReorder(alone, { onReorder });
    drag('dragstart', alone);
    key(alone, 'ArrowDown');
    expect(alone.dataset.dragging).toBeUndefined();
    expect(onReorder).not.toHaveBeenCalled();
    stop();
  });

  it('works without a dataTransfer and when the moved row disappears', async () => {
    const root = mountHtml(items());
    wireListReorder(root, {
      onReorder: () => {
        root.innerHTML = '';
      },
    });
    const bare = (type: string, target: HTMLElement) =>
      target.dispatchEvent(
        new Event(type, { bubbles: true, cancelable: true }),
      );
    bare('dragstart', row(root, 'one'));
    expect(row(root, 'one').dataset.dragging).toBe('true');
    bare('dragover', row(root, 'two'));
    expect(row(root, 'two').dataset.dropPosition).toBeDefined();
    key(row(root, 'two'), 'ArrowDown');
    await Promise.resolve();
    expect(root.childElementCount).toBe(0);
  });
});

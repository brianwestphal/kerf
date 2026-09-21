import type { ArrayPatch } from './array-signal.js';
import type { BindListOptions, ListKey, RowElement } from './list.js';
import { captureFocus, restoreFocus } from './list-reconcile-focus.js';
import { mount, type MountResult } from './mount.js';
import { moveNode } from './utils/moveNode.js';

interface ListRow<T> {
  el: HTMLElement;
  item: T;
  dispose: () => void;
  elementMode: boolean;
  update?: (item: T) => void;
}

export interface ListRowController<T> {
  readonly order: Array<ListRow<T>>;
  sync: (visible: readonly T[]) => void;
  applyPatches: (patches: readonly ArrayPatch<T>[]) => void;
  dispose: (removeElements: boolean) => void;
}

interface ListRowControllerOptions<T> {
  container: HTMLElement;
  key: (item: T) => ListKey;
  render: BindListOptions<T>['render'];
  tag: string;
  endAnchor: () => Node | null;
}

const NOOP = (): void => {
  /* element-mode rows with no caller teardown */
};

/** Own the keyed row map, DOM order, row lifecycles, and both reconcile paths. */
export function createListRowController<T>(
  options: ListRowControllerOptions<T>,
): ListRowController<T> {
  const { container, key, render, tag, endAnchor } = options;
  const rows = new Map<ListKey, ListRow<T>>();
  const order: Array<ListRow<T>> = [];

  const asElementRow = (
    rendered: MountResult | RowElement<T>,
  ): {
    el: HTMLElement;
    dispose: () => void;
    update?: (item: T) => void;
  } | null => {
    if (rendered instanceof HTMLElement) return { el: rendered, dispose: NOOP };
    if (
      rendered !== null &&
      typeof rendered === 'object' &&
      'el' in rendered &&
      (rendered as { el: unknown }).el instanceof HTMLElement
    ) {
      const row = rendered as {
        el: HTMLElement;
        update?: (item: T) => void;
        dispose?: () => void;
      };
      return { el: row.el, dispose: row.dispose ?? NOOP, update: row.update };
    }
    return null;
  };

  const makeRow = (item: T): ListRow<T> => {
    const elementRow = asElementRow(render(item));
    if (elementRow !== null) {
      return {
        el: elementRow.el,
        item,
        dispose: elementRow.dispose,
        elementMode: true,
        update: elementRow.update,
      };
    }
    const el = document.createElement(tag);
    const dispose = mount(el, () => render(item) as MountResult);
    return { el, item, dispose, elementMode: false };
  };

  // The single item-replacement contract used by snapshot and granular paths.
  // Element-mode rows keep their caller-owned element and are re-keyed; content
  // rows replace their mount. DOM placement remains the caller's responsibility.
  const reconcileItem = (row: ListRow<T>, item: T): ListRow<T> => {
    if (row.item === item) return row;
    const oldKey = key(row.item);
    const newKey = key(item);
    if (row.elementMode) {
      row.item = item;
      if (newKey !== oldKey) {
        rows.delete(oldKey);
        rows.set(newKey, row);
      }
      row.update?.(item);
      return row;
    }
    row.dispose();
    row.el.remove();
    rows.delete(oldKey);
    const fresh = makeRow(item);
    rows.set(newKey, fresh);
    return fresh;
  };

  const preserveFocus = (operation: () => void): void => {
    const focus = captureFocus(container);
    try {
      operation();
    } finally {
      if (focus !== null) restoreFocus(focus);
    }
  };

  const sync = (visible: readonly T[]): void => {
    preserveFocus(() => {
      const wanted = new Set<ListKey>();
      for (const item of visible) wanted.add(key(item));

      for (const [rowKey, row] of rows) {
        if (!wanted.has(rowKey)) {
          row.dispose();
          row.el.remove();
          rows.delete(rowKey);
        }
      }

      order.length = 0;
      for (const item of visible) {
        const rowKey = key(item);
        const existing = rows.get(rowKey);
        const row =
          existing === undefined
            ? makeRow(item)
            : reconcileItem(existing, item);
        if (existing === undefined) rows.set(rowKey, row);
        order.push(row);
      }

      let ref: Node | null = endAnchor();
      for (let index = order.length - 1; index >= 0; index--) {
        const el = order[index].el;
        if (el.parentNode !== container || el.nextSibling !== ref)
          moveNode(container, el, ref);
        ref = el;
      }
    });
  };

  const applyPatches = (patches: readonly ArrayPatch<T>[]): void => {
    preserveFocus(() => {
      for (const patch of patches) {
        if (patch.type === 'insert') {
          const row = makeRow(patch.item);
          rows.set(key(patch.item), row);
          order.splice(patch.index, 0, row);
          container.insertBefore(
            row.el,
            order[patch.index + 1]?.el ?? endAnchor(),
          );
        } else if (patch.type === 'remove') {
          const [row] = order.splice(patch.index, 1);
          row.dispose();
          row.el.remove();
          rows.delete(key(row.item));
        } else if (patch.type === 'move') {
          const [row] = order.splice(patch.from, 1);
          order.splice(patch.to, 0, row);
          moveNode(container, row.el, order[patch.to + 1]?.el ?? endAnchor());
        } else if (patch.type === 'update') {
          const current = order[patch.index];
          const row = reconcileItem(current, patch.item);
          if (row !== current) {
            order[patch.index] = row;
            container.insertBefore(
              row.el,
              order[patch.index + 1]?.el ?? endAnchor(),
            );
          }
        }
      }
    });
  };

  const dispose = (removeElements: boolean): void => {
    for (const row of rows.values()) {
      row.dispose();
      if (removeElements) row.el.remove();
    }
    rows.clear();
    order.length = 0;
  };

  return { order, sync, applyPatches, dispose };
}

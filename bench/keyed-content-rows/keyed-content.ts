// Experiment only. Consumer imports and the published Kerf ABI are unchanged.
import { signal as cell, type Signal } from '@preact/signals-core';
import {
  batch,
  computed,
  effect,
  mount,
  signal,
  type MountResult,
} from 'kerfjs';
import {
  bindList,
  type BindListOptions,
  type ListKey,
  type ListSource,
} from 'kerfjs/list';

type Options<T> = Pick<
  BindListOptions<T>,
  'key' | 'tag' | 'before' | 'virtualize'
> & {
  content: (item: T, sourceIndex: () => number) => MountResult;
  positionStrategy?: 'eager' | 'watched';
  stats?: { positionCells: number; positionWrites: number; scans: number };
};

export function bindKeyedContent<T>(
  parent: HTMLElement,
  source: ListSource<T>,
  options: Options<T>,
): () => void {
  const { key, content, positionStrategy = 'watched', stats } = options;
  const positions = new Map<ListKey, Signal<number>>();
  const indices = computed(() => {
    if (stats) stats.scans++;
    const map = new Map<ListKey, number>();
    const items = source.value;
    for (let i = 0; i < items.length; i++) {
      const id = key(items[i]);
      if (map.has(id)) return undefined; // bindList rejects the snapshot.
      map.set(id, i);
    }
    return map;
  });
  // The outer observer tracks only source notifications. Do not read row
  // signals here. A list without index readers does no position scans.
  const stopPositions = effect(() => {
    void source.value;
    if (positions.size === 0) return;
    const next = indices.peek();
    if (!next) return;
    batch(() => {
      for (const [id, value] of positions) {
        const index = next.get(id);
        if (index !== undefined && value.peek() !== index) {
          value.value = index;
          if (stats) stats.positionWrites++;
        }
      }
    });
  });
  try {
    const list = bindList(parent, source, {
      key,
      tag: options.tag,
      before: options.before,
      virtualize: options.virtualize,
      render(initial) {
        let id = key(initial);
        const el = parent.ownerDocument.createElement(options.tag ?? 'div');
        const current = signal({ item: initial });
        let position: Signal<number> | undefined;
        const lookup = () => indices.peek()?.get(id) ?? -1;
        function positionCell() {
          if (!position) {
            if (stats) stats.positionCells++;
            position = cell(lookup(), {
              watched() {
                positions.set(id, position!);
              },
              unwatched() {
                if (positionStrategy === 'watched') positions.delete(id);
              },
            });
            if (positionStrategy === 'eager') positions.set(id, position);
          }
          return position;
        }
        if (positionStrategy === 'eager') positionCell();
        function index() {
          const value = positionCell();
          if (!positions.has(id)) value.value = lookup();
          return value.value;
        }
        try {
          const start = () =>
            mount(el, () => content(current.value.item, index));
          let stop: (() => void) | undefined = start();
          return {
            el,
            // bindList calls update only after a changed reference/version.
            // A fresh holder invalidates the row even for an in-place update.
            update: (item: T) => {
              const nextId = key(item);
              if (id !== nextId) {
                stop?.();
                stop = undefined;
                positions.delete(id);
                id = nextId;
                position = undefined;
                if (positionStrategy === 'eager') positionCell();
              }
              current.value = { item };
              stop ??= start();
            },
            dispose() {
              stop?.();
              positions.delete(id);
            },
          };
        } catch (error) {
          positions.delete(id);
          throw error;
        }
      },
    });
    return () => {
      stopPositions();
      positions.clear();
      list();
    };
  } catch (error) {
    stopPositions();
    positions.clear();
    throw error;
  }
}

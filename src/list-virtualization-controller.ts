import type { BindListOptions, ListKey } from './list.js';
import type { ListRowController } from './list-row-controller.js';

interface ListVirtualizationController<T> {
  readonly contentVisibility: boolean;
  render: (items: readonly T[]) => void;
  start: () => void;
  setHeight: (key: ListKey, height: number) => void;
  onRender: (callback: () => void) => () => void;
  dispose: () => void;
}

interface ListVirtualizationControllerOptions<T> {
  parent: HTMLElement;
  container: HTMLElement;
  virtualize: NonNullable<BindListOptions<T>['virtualize']>;
  key: (item: T) => ListKey;
  rows: ListRowController<T>;
}

/** A pixel height: a finite number >= 0 (zero-height rows are allowed). */
function assertHeight(value: unknown, what: string): number {
  if (!(typeof value === 'number' && value >= 0 && value < Infinity))
    throw new RangeError(
      `bindList: ${what} must be a finite height >= 0 (got ${String(value)})`,
    );
  return value;
}

/** Reject an invalid `virtualize` configuration before any DOM is touched. */
function validateVirtualize<T>(
  virtualize: NonNullable<BindListOptions<T>['virtualize']>,
): void {
  const { rowHeight, overscan, minRows } = virtualize;
  for (const [name, count] of [
    ['overscan', overscan],
    ['minRows', minRows],
  ] as const) {
    if (count !== undefined && !(Number.isInteger(count) && count >= 0))
      throw new RangeError(
        `bindList: virtualize.${name} must be an integer >= 0 (got ${count})`,
      );
  }
  if (typeof rowHeight === 'number') {
    // Window mode divides by a fixed height; content-visibility only uses it as
    // a placeholder size, where zero is harmless.
    if (
      assertHeight(rowHeight, 'rowHeight') === 0 &&
      virtualize.mode !== 'content-visibility'
    )
      throw new RangeError(
        'bindList: a fixed rowHeight must be > 0 in window mode',
      );
  } else if (typeof rowHeight !== 'function') {
    const estimate = (rowHeight as { estimate?: unknown } | null)?.estimate;
    if (typeof estimate !== 'function')
      assertHeight(estimate, 'rowHeight.estimate');
  }
}

/** Own window calculation, height models, scheduling, observers, and CSS strategy. */
export function createListVirtualizationController<T>(
  options: ListVirtualizationControllerOptions<T>,
): ListVirtualizationController<T> {
  const { parent, container, virtualize, key, rows } = options;
  validateVirtualize(virtualize);
  const overscan = virtualize.overscan ?? 3;
  const { minRows, rowHeight } = virtualize;
  const contentVisibility = virtualize.mode === 'content-visibility';
  const fixedHeight = typeof rowHeight === 'number' ? rowHeight : null;
  const measuring = typeof rowHeight === 'object' && rowHeight !== null;
  const measured = new Map<ListKey, number>();
  const indexByKey = new Map<ListKey, number>();
  const renderSubscribers = new Set<() => void>();
  let items: readonly T[] = [];
  let offsets: number[] = [0];
  let heightsDirty = true;
  // Measured-mode anchor correction is resolved at frame time, not at
  // setHeight() time: each key remembers the height it had before its first
  // report this frame, and the frame applies the net change only for keys
  // still in the source AND still above the viewport top. A delta summed at
  // report time went stale when the source removed or reordered the key, or
  // the user scrolled, before the frame ran (KF-FJ40AE).
  const pendingAnchorBaselines = new Map<ListKey, number>();
  let rafPending = false;
  let disposed = false;

  const estimateAt = (index: number): number => {
    const estimate = (
      rowHeight as { estimate: number | ((item: T, index: number) => number) }
    ).estimate;
    return typeof estimate === 'function'
      ? assertHeight(
          estimate(items[index], index),
          `rowHeight.estimate(item, ${index})`,
        )
      : estimate;
  };
  const variableHeightAt: ((index: number) => number) | null =
    fixedHeight !== null
      ? null
      : measuring
        ? (index): number =>
            measured.get(key(items[index])) ?? estimateAt(index)
        : (index): number =>
            assertHeight(
              (rowHeight as (item: T, index: number) => number)(
                items[index],
                index,
              ),
              `rowHeight(item, ${index})`,
            );
  const intrinsicSizeAt = (index: number): number =>
    fixedHeight ?? (variableHeightAt as (index: number) => number)(index);

  const rebuildOffsets = (): void => {
    const heightAt = variableHeightAt as (index: number) => number;
    offsets = new Array<number>(items.length + 1);
    offsets[0] = 0;
    if (measuring) indexByKey.clear();
    for (let index = 0; index < items.length; index++) {
      offsets[index + 1] = offsets[index] + heightAt(index);
      if (measuring) indexByKey.set(key(items[index]), index);
    }
    if (measuring) {
      for (const rowKey of measured.keys()) {
        if (!indexByKey.has(rowKey)) measured.delete(rowKey);
      }
      for (const rowKey of pendingAnchorBaselines.keys()) {
        if (!indexByKey.has(rowKey)) pendingAnchorBaselines.delete(rowKey);
      }
    }
  };

  const findStart = (target: number, total: number): number => {
    let low = 0;
    let high = total;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (offsets[middle] <= target) low = middle;
      else high = middle - 1;
    }
    return low;
  };

  const findEnd = (target: number, total: number): number => {
    let low = 0;
    let high = total;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (offsets[middle] >= target) high = middle;
      else low = middle + 1;
    }
    return low;
  };

  const sizeRows = (start: number): void => {
    if (measuring) return;
    for (let index = 0; index < rows.order.length; index++) {
      const absoluteIndex = start + index;
      const height =
        fixedHeight ?? offsets[absoluteIndex + 1] - offsets[absoluteIndex];
      rows.order[index].el.style.height = `${height}px`;
    }
  };

  const renderCurrent = (): void => {
    if (contentVisibility) {
      rows.sync(items);
      for (let index = 0; index < rows.order.length; index++) {
        const el = rows.order[index].el;
        el.style.contentVisibility = 'auto';
        el.style.containIntrinsicSize = `0 ${intrinsicSizeAt(index)}px`;
      }
      return;
    }

    const total = items.length;
    let start: number;
    let end: number;
    let padTop: number;
    let padBottom: number;
    if (minRows !== undefined && total < minRows) {
      if (fixedHeight === null && heightsDirty) {
        rebuildOffsets();
        heightsDirty = false;
      }
      start = 0;
      end = total;
      padTop = 0;
      padBottom = 0;
    } else if (fixedHeight !== null) {
      const viewportBottom = parent.scrollTop + parent.clientHeight;
      // Clamp to `total`: a source that shrinks while scrolled deep (before the
      // browser clamps scrollTop) must not pad past the content (KF-FJ40AE).
      start = Math.min(
        total,
        Math.max(0, Math.floor(parent.scrollTop / fixedHeight) - overscan),
      );
      end = Math.min(total, Math.ceil(viewportBottom / fixedHeight) + overscan);
      padTop = start * fixedHeight;
      padBottom = Math.max(0, total - end) * fixedHeight;
    } else {
      if (heightsDirty) {
        rebuildOffsets();
        heightsDirty = false;
      }
      const viewportBottom = parent.scrollTop + parent.clientHeight;
      start = Math.max(0, findStart(parent.scrollTop, total) - overscan);
      end = Math.min(total, findEnd(viewportBottom, total) + overscan);
      padTop = offsets[start];
      padBottom = offsets[total] - offsets[end];
    }
    rows.sync(items.slice(start, end));
    sizeRows(start);
    container.style.paddingTop = `${padTop}px`;
    container.style.paddingBottom = `${padBottom}px`;
    for (const callback of renderSubscribers) callback();
  };

  const render = (nextItems: readonly T[]): void => {
    items = nextItems;
    heightsDirty = true;
    renderCurrent();
  };

  const applyAnchorCorrection = (): void => {
    if (heightsDirty) {
      rebuildOffsets();
      heightsDirty = false;
    }
    let delta = 0;
    for (const [rowKey, baseline] of pendingAnchorBaselines) {
      // rebuildOffsets() just pruned every key that left the source.
      const index = indexByKey.get(rowKey) as number;
      if (offsets[index] + baseline <= parent.scrollTop)
        delta += offsets[index + 1] - offsets[index] - baseline;
    }
    pendingAnchorBaselines.clear();
    if (delta !== 0) parent.scrollTop += delta;
  };

  const scheduleRender = (): void => {
    if (rafPending) return;
    rafPending = true;
    globalThis.requestAnimationFrame(() => {
      rafPending = false;
      if (disposed) return;
      if (pendingAnchorBaselines.size > 0) applyAnchorCorrection();
      renderCurrent();
    });
  };

  const resizeObserver =
    !contentVisibility && globalThis.ResizeObserver !== undefined
      ? new globalThis.ResizeObserver(scheduleRender)
      : undefined;

  const start = (): void => {
    if (contentVisibility) return;
    parent.addEventListener('scroll', scheduleRender);
    resizeObserver?.observe(parent);
  };

  const setHeight = (rowKey: ListKey, height: number): void => {
    assertHeight(height, 'setHeight()');
    if (!measuring || contentVisibility) return;
    const index = indexByKey.get(rowKey);
    if (index === undefined) return;
    const oldHeight = measured.get(rowKey) ?? estimateAt(index);
    if (height === oldHeight) return;
    measured.set(rowKey, height);
    if (!pendingAnchorBaselines.has(rowKey))
      pendingAnchorBaselines.set(rowKey, oldHeight);
    heightsDirty = true;
    scheduleRender();
  };

  const onRender = (callback: () => void): (() => void) => {
    renderSubscribers.add(callback);
    return () => renderSubscribers.delete(callback);
  };

  const dispose = (): void => {
    disposed = true;
    parent.removeEventListener('scroll', scheduleRender);
    resizeObserver?.disconnect();
    renderSubscribers.clear();
  };

  return { contentVisibility, render, start, setHeight, onRender, dispose };
}

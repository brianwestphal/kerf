import type { BindListOptions, ListKey } from './list.js';
import type { ListRowController } from './list-row-controller.js';

interface ListVirtualizationController<T> {
  readonly contentVisibility: boolean;
  render: (items: readonly T[]) => void;
  reject: () => void;
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

/** A measured row's seed before its first report: pixels, or derived from the item. */
type Estimate<T> = number | ((item: T, index: number) => number);

// The height-model tags. Small integers rather than strings: the tag is
// compared on every row of `rebuildOffsets` and the names below keep the
// switches readable, while the literals cost nothing in the bundle.
const FIXED = 0;
const DECLARED = 1;
const MEASURED = 2;

/**
 * `rowHeight` normalized once into the three height models (docs/17): every
 * row a fixed pixel height, app-declared variable heights derived from the
 * item, or measured heights the app reports after layout, seeded by an
 * estimate. Every mode-dependent decision below switches on `kind`, so adding
 * a model fails to compile at each site that has to know about it.
 */
type HeightModel<T> =
  | { kind: typeof FIXED; px: number }
  | { kind: typeof DECLARED; at: (item: T, index: number) => number }
  | { kind: typeof MEASURED; estimate: Estimate<T> };

/** A pixel height: a finite number >= 0 (zero-height rows are allowed). */
function assertHeight(value: unknown, what: string): number {
  if (!(typeof value === 'number' && value >= 0 && value < Infinity))
    throw new RangeError(
      `bindList: ${what} must be a finite height >= 0 (got ${String(value)})`,
    );
  return value;
}

/**
 * Validate `rowHeight` and classify it into its height model, in one pass over
 * its runtime type. Rejects an invalid value before any DOM is touched.
 */
function heightModelOf<T>(
  virtualize: NonNullable<BindListOptions<T>['virtualize']>,
): HeightModel<T> {
  const { rowHeight } = virtualize;
  switch (typeof rowHeight) {
    case 'number':
      // Window mode divides by a fixed height; content-visibility only uses it
      // as a placeholder size, where zero is harmless.
      if (
        assertHeight(rowHeight, 'rowHeight') === 0 &&
        virtualize.mode !== 'content-visibility'
      )
        throw new RangeError(
          'bindList: a fixed rowHeight must be > 0 in window mode',
        );
      return { kind: FIXED, px: rowHeight };
    case 'function':
      return { kind: DECLARED, at: rowHeight };
    default: {
      // Untrusted input: `rowHeight` may be anything at runtime, so read the
      // estimate off an optional shape before trusting the declared type.
      const estimate = (rowHeight as { estimate?: unknown } | null)?.estimate;
      if (typeof estimate !== 'function')
        assertHeight(estimate, 'rowHeight.estimate');
      return { kind: MEASURED, estimate: rowHeight.estimate };
    }
  }
}

/** Reject invalid `overscan` / `minRows` before any DOM is touched. */
function validateCounts<T>(
  virtualize: NonNullable<BindListOptions<T>['virtualize']>,
): void {
  const { overscan, minRows } = virtualize;
  for (const [name, count] of [
    ['overscan', overscan],
    ['minRows', minRows],
  ] as const) {
    if (count !== undefined && !(Number.isInteger(count) && count >= 0))
      throw new RangeError(
        `bindList: virtualize.${name} must be an integer >= 0 (got ${count})`,
      );
  }
}

/** Own window calculation, height models, scheduling, observers, and CSS strategy. */
export function createListVirtualizationController<T>(
  options: ListVirtualizationControllerOptions<T>,
): ListVirtualizationController<T> {
  const { parent, container, virtualize, key, rows } = options;
  validateCounts(virtualize);
  const overscan = virtualize.overscan ?? 3;
  const { minRows } = virtualize;
  const contentVisibility = virtualize.mode === 'content-visibility';
  const model = heightModelOf(virtualize);
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
  // An arraySignal mutates its array in place. After key preflight rejects a
  // write, `items` may already alias the invalid array; frames must not read it.
  let frozen = false;

  const estimateOf = (estimate: Estimate<T>, index: number): number =>
    typeof estimate === 'function'
      ? assertHeight(
          estimate(items[index], index),
          `rowHeight.estimate(item, ${index})`,
        )
      : estimate;

  /** The model's height for row `index` (a measured row's report once it has one). */
  const heightAt = (index: number): number => {
    switch (model.kind) {
      case FIXED:
        return model.px;
      case DECLARED:
        return assertHeight(
          model.at(items[index], index),
          `rowHeight(item, ${index})`,
        );
      case MEASURED:
        return (
          measured.get(key(items[index])) ?? estimateOf(model.estimate, index)
        );
    }
  };

  const rebuildOffsets = (): void => {
    const measuring = model.kind === MEASURED;
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
    // A measured row is sized by its own content; the app reports the result.
    if (model.kind === MEASURED) return;
    for (let index = 0; index < rows.order.length; index++) {
      const absoluteIndex = start + index;
      const height =
        model.kind === FIXED
          ? model.px
          : offsets[absoluteIndex + 1] - offsets[absoluteIndex];
      rows.order[index].el.style.height = `${height}px`;
    }
  };

  const renderCurrent = (): void => {
    if (contentVisibility) {
      rows.sync(items);
      for (let index = 0; index < rows.order.length; index++) {
        const el = rows.order[index].el;
        el.style.contentVisibility = 'auto';
        el.style.containIntrinsicSize = `0 ${heightAt(index)}px`;
      }
      return;
    }

    const total = items.length;
    let start: number;
    let end: number;
    let padTop: number;
    let padBottom: number;
    if (minRows !== undefined && total < minRows) {
      if (model.kind !== FIXED && heightsDirty) {
        rebuildOffsets();
        heightsDirty = false;
      }
      start = 0;
      end = total;
      padTop = 0;
      padBottom = 0;
    } else {
      const { scrollTop } = parent;
      const viewportBottom = scrollTop + parent.clientHeight;
      switch (model.kind) {
        case FIXED: {
          const { px } = model;
          // Clamp to `total`: a source that shrinks while scrolled deep (before
          // the browser clamps scrollTop) must not pad past the content
          // (KF-FJ40AE).
          start = Math.min(
            total,
            Math.max(0, Math.floor(scrollTop / px) - overscan),
          );
          end = Math.min(total, Math.ceil(viewportBottom / px) + overscan);
          padTop = start * px;
          padBottom = Math.max(0, total - end) * px;
          break;
        }
        case DECLARED:
        case MEASURED:
          if (heightsDirty) {
            rebuildOffsets();
            heightsDirty = false;
          }
          start = Math.max(0, findStart(scrollTop, total) - overscan);
          end = Math.min(total, findEnd(viewportBottom, total) + overscan);
          padTop = offsets[start];
          padBottom = offsets[total] - offsets[end];
      }
    }
    rows.sync(items.slice(start, end));
    sizeRows(start);
    container.style.paddingTop = `${padTop}px`;
    container.style.paddingBottom = `${padBottom}px`;
    for (const callback of renderSubscribers) callback();
  };

  const render = (nextItems: readonly T[]): void => {
    const wasFrozen = frozen;
    items = nextItems;
    heightsDirty = true;
    frozen = false;
    // A frame dropped during a rejected update cannot apply measured-height
    // anchoring. Resolve those reports against this accepted source now.
    if (wasFrozen && pendingAnchorBaselines.size > 0) applyAnchorCorrection();
    renderCurrent();
  };

  const reject = (): void => {
    frozen = true;
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
      if (disposed || frozen) return;
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
    if (model.kind !== MEASURED || contentVisibility) return;
    const index = indexByKey.get(rowKey);
    if (index === undefined) return;
    // `items` may alias a rejected in-place arraySignal update while frozen.
    // The accepted offsets still hold this key's last rendered estimate.
    const oldHeight =
      measured.get(rowKey) ?? offsets[index + 1] - offsets[index];
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

  return { contentVisibility, render, reject, start, setHeight, onRender, dispose };
}

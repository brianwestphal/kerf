/**
 * Property-based harness for `bindList` (KF-YVMSEK), the largest stateful
 * surface the `each()` harness never reached.
 *
 * Same philosophy as `model.ts` / `harness.ts`: a JSON-serializable spec, a
 * data-only mutation alphabet, invariants checked after every step, and a
 * class-preserving shrinker that turns a failing seed into a paste-ready case.
 *
 * The states it walks: the snapshot path (plain `signal<T[]>` source, or an
 * `arraySignal` after `replace()`), the granular patch path, the latched
 * snapshot recovery after a duplicate key or a row-render throw, the virtualized
 * window in every height model (fixed / declared / measured / content-visibility)
 * crossed with `minRows` above or below the length, a second list over the same
 * `arraySignal` (one consumer drains the patch queue, the other snapshots), and
 * the disposed list.
 *
 * Invariants:
 *  - **differential** — a fresh `bindList` over the same spec and state (same
 *    viewport, same reported heights, same `scrollTop`) must snapshot-equal the
 *    incrementally reconciled one;
 *  - **targeted** — rows mirror the source in order and text; a row whose item
 *    reference survived keeps its element (an element-mode row keeps it whenever
 *    its key survives); a fine-grained signal write rebuilds nothing; an
 *    element-mode `dispose` runs only on genuine removal;
 *  - **virtualized oracle**, independent of the controller's prefix sums — the
 *    rendered rows are a contiguous slice, every row intersecting the viewport is
 *    rendered, and `padTop + window + padBottom` equals the model's total height
 *    (fixed px, the declared function, or the measured map with the KF-512 prune);
 *  - **recovery** — a step may throw only while the source is invalid (a
 *    duplicate key, or a poison item for a list whose render rejects them); after
 *    a `cure` every invariant must hold again; after `dispose` the parent stays
 *    byte-identical and the disposed list never throws.
 */
import { ArraySignal, arraySignal } from '../../../src/array-signal.js';
import { batch, type Signal, signal } from '../../../src/index.js';
import { jsx } from '../../../src/jsx-runtime.js';
import {
  bindList,
  type BindListHandle,
  type BindListOptions,
  type RowHeight,
} from '../../../src/list.js';
import { snapshot } from './invariants.js';
import type { Rng } from './rng.js';

export interface BItem {
  id: string;
  t: string;
  /** A poison item: a non-tolerant `render` throws for it. */
  bad?: boolean;
}

export type HeightModel = 'fixed' | 'declared' | 'measured' | 'cv';

export interface VirtualizeSpec {
  model: HeightModel;
  /** `minRows` option, or null for none. */
  minRows: number | null;
  overscan: number;
  /** The scroll parent's `clientHeight` (happy-dom has no layout, so it is stubbed). */
  viewport: number;
  /** Measured mode: a function estimate instead of a constant one. */
  estimateFn: boolean;
}

export interface BindListSpec {
  source: 'granular' | 'plain';
  ids: string[];
  /** Content rows (kerf mounts JSX in a `<li>`) or element rows (`render` returns the element). */
  mode: 'content' | 'element';
  /** Content rows also read a shared signal through a fine-grained hole. */
  rowSig: boolean;
  /** A fixed trailing sibling the rows must end before (non-virtualized only). */
  before: boolean;
  virtualize: VirtualizeSpec | null;
  /** A second, render-tolerant, non-virtualized content list over the same source. */
  twin: boolean;
}

export type BMutation =
  | { k: 'insert'; at: number; id: string; bad?: boolean }
  | { k: 'remove'; at: number }
  | { k: 'move'; from: number; to: number }
  | { k: 'update'; at: number; t: string; bad?: boolean }
  /** A new object with a NEW key at `at` — `id` may duplicate another row's key. */
  | { k: 'rekey'; at: number; id: string }
  /** Same-reference update (granular); a plain source copies. */
  | { k: 'mutate'; at: number; t: string }
  /** `badAt` poisons that index of the new array — a row-render throw on the SNAPSHOT path. */
  | { k: 'replace'; ids: string[]; badAt?: number }
  | { k: 'batch'; ms: BMutation[] }
  | { k: 'sig'; v: string }
  | { k: 'scroll'; top: number }
  /** `handle.setHeight(key(items[at]), px)` — measured mode. */
  | { k: 'height'; at: number; px: number }
  /** Make the source valid again: un-poison every item and de-duplicate keys. */
  | { k: 'cure'; via: 'patch' | 'replace' }
  /** Dispose the primary list (the twin, if any, keeps running). */
  | { k: 'dispose' };

export const FIXED_PX = 20;

/** The declared-height function: pure in (item, index), so moves change heights. */
export function declaredHeight(item: BItem, index: number): number {
  return 10 + (item.id.length % 2) * 10 + (index % 2) * 20;
}

/** The measured-mode estimate (function form). */
export function estimateHeight(_item: BItem, index: number): number {
  return 15 + (index % 2) * 10;
}
const ESTIMATE_PX = 25;

export function describeBMutation(m: BMutation): string {
  return m.k === 'batch'
    ? `batch(${m.ms.map(describeBMutation).join(', ')})`
    : JSON.stringify(m);
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export function generateBindListSpec(rng: Rng): BindListSpec {
  const virtualized = rng.bool(0.5);
  return {
    source: rng.bool(0.6) ? 'granular' : 'plain',
    ids: Array.from({ length: rng.range(0, 8) }, (_, i) => `i${i}`),
    mode: rng.bool(0.7) ? 'content' : 'element',
    rowSig: rng.bool(0.5),
    before: !virtualized && rng.bool(0.4),
    virtualize: virtualized
      ? {
          model: rng.pick(['fixed', 'declared', 'measured', 'cv'] as const),
          minRows: rng.pick([null, 3, 100]),
          overscan: rng.pick([0, 1, 3]),
          viewport: rng.pick([40, 100]),
          estimateFn: rng.bool(0.5),
        }
      : null,
    twin: rng.bool(0.3),
  };
}

/** The pure model the generator walks so indices stay valid. */
interface Sim {
  items: BItem[];
  disposed: boolean;
}

function uniqueKeys(items: readonly BItem[]): boolean {
  return new Set(items.map((i) => i.id)).size === items.length;
}

function hasBad(items: readonly BItem[]): boolean {
  return items.some((i) => i.bad === true);
}

function genOne(
  rng: Rng,
  spec: BindListSpec,
  sim: Sim,
  allowBatch: boolean,
): BMutation {
  const len = sim.items.length;
  const invalid = !uniqueKeys(sim.items) || hasBad(sim.items);
  if (invalid && rng.bool(0.7))
    return { k: 'cure', via: rng.bool(0.5) ? 'patch' : 'replace' };
  const roll = rng.next();
  if (allowBatch && roll < 0.12) {
    const n = rng.range(2, 3);
    return {
      k: 'batch',
      ms: Array.from({ length: n }, () => genOne(rng, spec, sim, false)),
    };
  }
  if (roll < 0.2 && spec.rowSig) return { k: 'sig', v: `v${rng.int(1000)}` };
  if (
    roll < 0.3 &&
    spec.virtualize !== null &&
    spec.virtualize.model !== 'cv'
  ) {
    return { k: 'scroll', top: rng.int(400) };
  }
  if (
    roll < 0.4 &&
    spec.virtualize !== null &&
    spec.virtualize.model === 'measured' &&
    len > 0
  ) {
    return { k: 'height', at: rng.int(len), px: rng.pick([0, 10, 30, 60]) };
  }
  if (allowBatch && roll < 0.43 && !sim.disposed) return { k: 'dispose' };
  if (roll < 0.51 || len === 0) {
    const ids = Array.from(
      { length: rng.range(0, 6) },
      (_, i) => `r${rng.int(1000)}_${i}`,
    );
    const m: BMutation = { k: 'replace', ids };
    if (ids.length > 0 && rng.bool(0.15)) m.badAt = rng.int(ids.length);
    return m;
  }
  const op = rng.next();
  if (op < 0.26) {
    const m: BMutation = {
      k: 'insert',
      at: rng.int(len + 1),
      id: `n${rng.int(10000)}`,
    };
    if (rng.bool(0.15)) m.bad = true;
    return m;
  }
  if (op < 0.44) return { k: 'remove', at: rng.int(len) };
  if (op < 0.58) return { k: 'move', from: rng.int(len), to: rng.int(len) };
  if (op < 0.76) {
    const m: BMutation = {
      k: 'update',
      at: rng.int(len),
      t: `T${rng.int(1000)}`,
    };
    if (rng.bool(0.15)) m.bad = true;
    return m;
  }
  // `mutate` (a same-reference `arraySignal.update()`) is deliberately NOT
  // generated: `bindList` reconciles rows by item identity and documents that
  // item objects must stay stable, so a same-reference change is invisible to
  // it — unlike `each()`, which honors the per-item version stamp. The
  // alphabet keeps the mutation for hand-written reproductions; the gap itself
  // is tracked separately (see the KF-YVMSEK report).
  // A duplicate key sometimes — the rejection + latched recovery shape.
  const at = rng.int(len);
  const other = sim.items.filter((_, i) => i !== at);
  const id =
    other.length > 0 && rng.bool(0.4)
      ? other[rng.int(other.length)].id
      : `k${rng.int(10000)}`;
  return { k: 'rekey', at, id };
}

/** Apply a mutation to the pure model (mirrors `applyBMutation` on the real source). */
function simApply(m: BMutation, sim: Sim): void {
  const { items } = sim;
  const len = items.length;
  switch (m.k) {
    case 'batch':
      for (const sub of m.ms) simApply(sub, sim);
      return;
    case 'sig':
    case 'scroll':
    case 'height':
      return;
    case 'dispose':
      sim.disposed = true;
      return;
    case 'cure':
      sim.items = cured(items);
      return;
    case 'replace':
      sim.items = replacement(m);
      return;
    case 'insert': {
      const item: BItem = { id: m.id, t: m.id.toUpperCase() };
      if (m.bad === true) item.bad = true;
      items.splice(Math.min(m.at, len), 0, item);
      return;
    }
    default:
      break;
  }
  if (len === 0) return;
  switch (m.k) {
    case 'remove':
      items.splice(m.at % len, 1);
      return;
    case 'move': {
      const [moved] = items.splice(m.from % len, 1);
      items.splice(m.to % len, 0, moved);
      return;
    }
    case 'update': {
      const next: BItem = { ...items[m.at % len], t: m.t };
      if (m.bad === true) next.bad = true;
      else delete next.bad;
      items[m.at % len] = next;
      return;
    }
    case 'rekey':
      items[m.at % len] = { ...items[m.at % len], id: m.id };
      return;
    case 'mutate':
      items[m.at % len].t = m.t;
      return;
  }
}

/** The array a `replace` mutation installs. */
function replacement(m: { ids: string[]; badAt?: number }): BItem[] {
  return m.ids.map((id, i) => {
    const item: BItem = { id, t: id.toUpperCase() };
    if (m.badAt === i) item.bad = true;
    return item;
  });
}

/** The valid version of `items`: no poison, later duplicates re-keyed. */
function cured(items: readonly BItem[]): BItem[] {
  const seen = new Set<string>();
  return items.map((item, i) => {
    let { id } = item;
    while (seen.has(id)) id = `${id}d${i}`;
    seen.add(id);
    const next: BItem = { id, t: item.t };
    return next;
  });
}

export function generateBMutations(
  rng: Rng,
  spec: BindListSpec,
  count: number,
): BMutation[] {
  const sim: Sim = {
    items: spec.ids.map((id) => ({ id, t: id.toUpperCase() })),
    disposed: false,
  };
  return Array.from({ length: count }, () => {
    const m = genOne(rng, spec, sim, true);
    simApply(m, sim);
    return m;
  });
}

// ---------------------------------------------------------------------------
// Instantiation
// ---------------------------------------------------------------------------

export interface BWorld {
  spec: BindListSpec;
  source: ArraySignal<BItem> | Signal<BItem[]>;
  sig: Signal<string>;
  /** Reported heights the live list should still honor (measured mode). */
  heights: Map<string, number>;
}

export function makeBWorld(spec: BindListSpec): BWorld {
  const items = spec.ids.map((id) => ({ id, t: id.toUpperCase() }));
  return {
    spec,
    source: spec.source === 'granular' ? arraySignal(items) : signal(items),
    sig: signal('s0'),
    heights: new Map(),
  };
}

function itemsOf(world: BWorld): readonly BItem[] {
  return world.source.value;
}

function keyOf(item: BItem): string {
  return item.id;
}

/**
 * The `render` for a list. `tolerant` lists render poison items; the primary
 * throws for them, which is what latches the snapshot recovery.
 */
function makeRowRender(
  world: BWorld,
  mode: BindListSpec['mode'],
  rowSig: boolean,
  tolerant: boolean,
): BindListOptions<BItem>['render'] {
  return (item) => {
    if (item.bad === true && !tolerant) throw new Error(`bad row ${item.id}`);
    if (mode === 'element') {
      const el = document.createElement('li');
      el.setAttribute('data-row', item.id);
      el.textContent = item.t;
      return {
        el,
        update: (next: BItem): void => {
          el.setAttribute('data-row', next.id);
          el.textContent = next.t;
        },
        dispose: (): void => {
          // Pinned by the invariants: a disposed element never stays live.
          el.setAttribute('data-disposed', '1');
        },
      };
    }
    return jsx('span', {
      'data-row': item.id,
      children: rowSig ? [item.t, world.sig] : item.t,
    });
  };
}

function withViewport(el: HTMLElement, h: number): void {
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: h });
}

function rowHeightOf(v: VirtualizeSpec): RowHeight<BItem> {
  switch (v.model) {
    case 'fixed':
    case 'cv':
      return FIXED_PX;
    case 'declared':
      return declaredHeight;
    case 'measured':
      return { estimate: v.estimateFn ? estimateHeight : ESTIMATE_PX };
  }
}

function virtualizeOptions(
  v: VirtualizeSpec,
): NonNullable<BindListOptions<BItem>['virtualize']> {
  const rowHeight = rowHeightOf(v);
  const out: NonNullable<BindListOptions<BItem>['virtualize']> = {
    rowHeight,
    overscan: v.overscan,
  };
  if (v.minRows !== null) out.minRows = v.minRows;
  if (v.model === 'cv') out.mode = 'content-visibility';
  return out;
}

interface LiveList {
  parent: HTMLElement;
  anchor: HTMLElement | null;
  handle: BindListHandle;
  tolerant: boolean;
  mode: BindListSpec['mode'];
  rowSig: boolean;
  virtualize: VirtualizeSpec | null;
}

function createList(
  world: BWorld,
  mode: BindListSpec['mode'],
  rowSig: boolean,
  tolerant: boolean,
  before: boolean,
  virtualize: VirtualizeSpec | null,
  scrollTop: number,
): LiveList {
  const parent = document.createElement('ul');
  document.body.appendChild(parent);
  let anchor: HTMLElement | null = null;
  if (before && virtualize === null) {
    anchor = document.createElement('button');
    anchor.textContent = 'add';
    parent.appendChild(anchor);
  }
  if (virtualize !== null) {
    withViewport(parent, virtualize.viewport);
    parent.scrollTop = scrollTop;
  }
  const options: BindListOptions<BItem> = {
    key: keyOf,
    render: makeRowRender(world, mode, rowSig, tolerant),
    tag: 'li',
  };
  if (anchor !== null) options.before = anchor;
  if (virtualize !== null) options.virtualize = virtualizeOptions(virtualize);
  const handle = bindList(parent, world.source, options);
  return { parent, anchor, handle, tolerant, mode, rowSig, virtualize };
}

// ---------------------------------------------------------------------------
// Fake animation frames (the virtualization controller schedules through rAF)
// ---------------------------------------------------------------------------

interface Frames {
  pending: FrameRequestCallback[];
  restore: () => void;
}

function installFrames(): Frames {
  const original = globalThis.requestAnimationFrame;
  const frames: Frames = {
    pending: [],
    restore: () => {
      globalThis.requestAnimationFrame = original;
    },
  };
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    frames.pending.push(cb);
    return frames.pending.length;
  };
  return frames;
}

/** Run every scheduled frame, and any frame those frames schedule. */
function flushFrames(frames: Frames): void {
  for (let round = 0; round < 8 && frames.pending.length > 0; round++) {
    const cbs = frames.pending;
    frames.pending = [];
    for (const cb of cbs) cb(0);
  }
}

// ---------------------------------------------------------------------------
// Applying mutations to the real world
// ---------------------------------------------------------------------------

interface RunState {
  world: BWorld;
  primary: LiveList;
  twin: LiveList | null;
  frames: Frames;
  disposed: boolean;
  /** `parent.innerHTML` right after `dispose`, which later steps must not change. */
  afterDispose: string | null;
  /** Keys the primary list's last render indexed (`setHeight` ignores any other). */
  indexed: Set<string>;
}

/**
 * After a notification the controller rendered (every one whose keys were
 * unique — a duplicate is rejected before the render), its key index and its
 * measured-height map follow the current source: heights for keys that left
 * are pruned (KF-512) and the new keys become reportable.
 */
function syncHeightModel(state: RunState, items: readonly BItem[]): void {
  const ids = new Set(items.map(keyOf));
  state.indexed = ids;
  for (const id of state.world.heights.keys())
    if (!ids.has(id)) state.world.heights.delete(id);
}

function applyBMutation(m: BMutation, state: RunState): void {
  const { world, primary } = state;
  const src = world.source;
  const current = src.value;
  const len = current.length;
  switch (m.k) {
    case 'batch':
      batch(() => {
        for (const sub of m.ms) applyBMutation(sub, state);
      });
      return;
    case 'sig':
      world.sig.value = m.v;
      return;
    case 'scroll':
      if (primary.virtualize !== null && !state.disposed) {
        primary.parent.scrollTop = m.top;
        primary.parent.dispatchEvent(new Event('scroll'));
      }
      return;
    case 'height': {
      if (len === 0) return;
      const item = current[m.at % len];
      primary.handle.setHeight(keyOf(item), m.px);
      // The controller honors a report only for a key its last render indexed
      // (a key inserted earlier in the same batch is unknown until the
      // notification renders) — `setHeight` is documented as a no-op for
      // unknown keys, so the model mirrors that.
      if (
        primary.virtualize?.model === 'measured' &&
        !state.disposed &&
        state.indexed.has(item.id)
      ) {
        world.heights.set(item.id, m.px);
      }
      return;
    }
    case 'dispose':
      if (state.disposed) return;
      primary.handle();
      state.disposed = true;
      state.afterDispose = primary.parent.innerHTML;
      return;
    case 'cure': {
      const fixed = cured(current);
      if (src instanceof ArraySignal && m.via === 'patch') {
        batch(() => {
          for (let i = 0; i < fixed.length; i++) {
            const want = fixed[i];
            const have = current[i];
            if (have.id !== want.id || have.bad === true)
              src.update(i, () => want);
          }
        });
      } else if (src instanceof ArraySignal) src.replace(fixed);
      else (src as Signal<BItem[]>).value = fixed;
      return;
    }
    case 'replace': {
      const items = replacement(m);
      if (src instanceof ArraySignal) src.replace(items);
      else (src as Signal<BItem[]>).value = items;
      return;
    }
    case 'insert': {
      const item: BItem = { id: m.id, t: m.id.toUpperCase() };
      if (m.bad === true) item.bad = true;
      if (src instanceof ArraySignal) src.insert(Math.min(m.at, len), item);
      else {
        const next = current.slice();
        next.splice(Math.min(m.at, len), 0, item);
        (src as Signal<BItem[]>).value = next;
      }
      return;
    }
    default:
      break;
  }
  if (len === 0) return;
  const at = m.k === 'move' ? m.from % len : m.at % len;
  const updated = (it: BItem): BItem => {
    switch (m.k) {
      case 'update': {
        const next: BItem = { ...it, t: m.t };
        if (m.bad === true) next.bad = true;
        else delete next.bad;
        return next;
      }
      case 'rekey':
        return { ...it, id: m.id };
      default:
        return { ...it, t: (m as { t: string }).t };
    }
  };
  if (src instanceof ArraySignal) {
    switch (m.k) {
      case 'remove':
        src.remove(at);
        return;
      case 'move':
        src.move(at, m.to % len);
        return;
      case 'update':
      case 'rekey':
        src.update(at, updated);
        return;
      case 'mutate':
        src.update(at, (it) => {
          it.t = m.t;
          return it;
        });
        return;
    }
  }
  const next = current.slice();
  switch (m.k) {
    case 'remove':
      next.splice(at, 1);
      break;
    case 'move': {
      const [moved] = next.splice(at, 1);
      next.splice(m.to % len, 0, moved);
      break;
    }
    default:
      next[at] = updated(next[at]);
      break;
  }
  (src as Signal<BItem[]>).value = next;
}

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

export type BViolationClass = 'throw' | 'content' | 'structure';

export interface BViolation {
  kind: BViolationClass;
  message: string;
}

function rowsOf(list: LiveList): HTMLElement[] {
  const container =
    list.virtualize !== null
      ? (list.handle.container as HTMLElement)
      : list.parent;
  return Array.from(container.children).filter(
    (el) => el !== list.anchor,
  ) as HTMLElement[];
}

function rowKey(row: Element): string {
  return (
    row.getAttribute('data-row') ??
    row.querySelector('[data-row]')?.getAttribute('data-row') ??
    '?'
  );
}

/** Live row elements by key. */
function identityMap(list: LiveList): Map<string, Element> {
  const map = new Map<string, Element>();
  for (const row of rowsOf(list)) map.set(rowKey(row), row);
  return map;
}

/** The model's height for row `index` of `items`. */
function modelHeight(
  v: VirtualizeSpec,
  world: BWorld,
  item: BItem,
  index: number,
): number {
  switch (v.model) {
    case 'fixed':
    case 'cv':
      return FIXED_PX;
    case 'declared':
      return declaredHeight(item, index);
    case 'measured':
      return (
        world.heights.get(item.id) ??
        (v.estimateFn ? estimateHeight(item, index) : ESTIMATE_PX)
      );
  }
}

function px(value: string): number {
  return value === '' ? 0 : Number(value.replace(/px$/, ''));
}

function checkRows(list: LiveList, world: BWorld): string | null {
  const items = itemsOf(world);
  const rows = rowsOf(list);
  const sigValue =
    list.mode === 'content' && list.rowSig ? world.sig.value : '';
  const textOf = (item: BItem): string => item.t + sigValue;

  for (const row of rows) {
    if (row.hasAttribute('data-disposed'))
      return `row ${rowKey(row)} is live but its element-mode dispose already ran`;
  }
  if (list.anchor !== null && list.parent.lastElementChild !== list.anchor)
    return 'the `before` anchor is no longer the last child of the parent';

  if (list.virtualize === null) {
    const keys = rows.map(rowKey);
    const want = items.map(keyOf);
    if (keys.join('|') !== want.join('|'))
      return `rows [${keys.join(',')}] but source says [${want.join(',')}]`;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].textContent !== textOf(items[i]))
        return `row ${keys[i]}: text ${JSON.stringify(rows[i].textContent)} but expected ${JSON.stringify(textOf(items[i]))}`;
    }
    return null;
  }

  // Virtualized: the rendered rows are a contiguous slice of the source.
  const v = list.virtualize;
  const container = list.handle.container as HTMLElement;
  const keys = rows.map(rowKey);
  const total = items.length;
  const heights = items.map((item, i) => modelHeight(v, world, item, i));
  const offsets = [0];
  for (const h of heights) offsets.push(offsets[offsets.length - 1] + h);
  let start = 0;
  if (keys.length > 0) {
    start = items.findIndex((it) => it.id === keys[0]);
    if (start === -1) return `virtualized row ${keys[0]} is not in the source`;
  }
  const end = start + keys.length;
  for (let i = 0; i < keys.length; i++) {
    if (items[start + i] === undefined || items[start + i].id !== keys[i])
      return `virtualized rows [${keys.join(',')}] are not a contiguous slice of the source at ${start}`;
    if (rows[i].textContent !== textOf(items[start + i]))
      return `virtualized row ${keys[i]}: text ${JSON.stringify(rows[i].textContent)} but expected ${JSON.stringify(textOf(items[start + i]))}`;
  }
  const renderAll =
    v.model === 'cv' || (v.minRows !== null && total < v.minRows);
  if (renderAll && (start !== 0 || end !== total))
    return `expected every row rendered (${total}), got the window [${start}, ${end})`;
  if (v.model === 'cv') {
    for (let i = 0; i < rows.length; i++) {
      const want = `0 ${heights[start + i]}px`;
      if (rows[i].style.containIntrinsicSize !== want)
        return `cv row ${keys[i]}: contain-intrinsic-size ${JSON.stringify(rows[i].style.containIntrinsicSize)} but expected ${JSON.stringify(want)}`;
    }
    return null;
  }
  // Every row that intersects the viewport must be rendered.
  const top = list.parent.scrollTop;
  const bottom = top + v.viewport;
  for (let i = 0; i < total; i++) {
    const intersects = offsets[i] < bottom && offsets[i + 1] > top;
    if (intersects && (i < start || i >= end))
      return `row ${items[i].id} (index ${i}, ${offsets[i]}–${offsets[i + 1]}px) intersects the viewport ${top}–${bottom}px but the window is [${start}, ${end})`;
  }
  // Padding conservation against the model's heights. An EMPTY window (scrolled
  // past the content before the browser clamps `scrollTop`, KF-FJ40AE) has no
  // row to anchor `start` on, so only conservation is asserted: the padding
  // must equal the whole content and never exceed it.
  const padTop = px(container.style.paddingTop);
  const padBottom = px(container.style.paddingBottom);
  if (keys.length === 0) {
    if (padTop + padBottom !== offsets[total] || padTop > offsets[total])
      return `empty window pads ${padTop}px + ${padBottom}px but the content is ${offsets[total]}px`;
    return null;
  }
  if (padTop !== offsets[start])
    return `padding-top ${padTop}px but the model puts row ${start} at ${offsets[start]}px`;
  if (padBottom !== offsets[total] - offsets[end])
    return `padding-bottom ${padBottom}px but the model has ${offsets[total] - offsets[end]}px below row ${end}`;
  for (let i = 0; i < rows.length; i++) {
    const want = v.model === 'measured' ? '' : `${heights[start + i]}px`;
    if (rows[i].style.height !== want)
      return `row ${keys[i]}: style.height ${JSON.stringify(rows[i].style.height)} but expected ${JSON.stringify(want)}`;
  }
  return null;
}

/** Fresh `bindList` over the same state; its DOM must match the live one. */
function differential(
  list: LiveList,
  world: BWorld,
  frames: Frames,
): string | null {
  const fresh = createList(
    world,
    list.mode,
    list.rowSig,
    list.tolerant,
    list.anchor !== null,
    list.virtualize,
    0,
  );
  try {
    if (list.virtualize !== null) {
      if (list.virtualize.model === 'measured') {
        const live = new Set(itemsOf(world).map(keyOf));
        for (const [id, h] of world.heights)
          if (live.has(id)) fresh.handle.setHeight(id, h);
        flushFrames(frames);
      }
      fresh.parent.scrollTop = list.parent.scrollTop;
      fresh.parent.dispatchEvent(new Event('scroll'));
      flushFrames(frames);
    }
    const got = snapshot(list.parent);
    const want = snapshot(fresh.parent);
    if (got === want) return null;
    return (
      `incremental DOM differs from a from-scratch bindList of the same state` +
      `\n--- from-scratch (expected)\n${want}\n--- incremental (actual)\n${got}`
    );
  } finally {
    fresh.handle();
    fresh.parent.remove();
  }
}

function checkList(
  list: LiveList,
  world: BWorld,
  frames: Frames,
): BViolation | null {
  const targeted = checkRows(list, world);
  if (targeted !== null) return { kind: 'content', message: targeted };
  const diff = differential(list, world, frames);
  return diff === null ? null : { kind: 'structure', message: diff };
}

/** Whether `list` is in a state its invariants can be asserted against. */
function listIsValid(list: LiveList, items: readonly BItem[]): boolean {
  return uniqueKeys(items) && (list.tolerant || !hasBad(items));
}

/**
 * Element identity across a step: a row whose item REFERENCE survived keeps its
 * element; an element-mode row keeps it whenever its KEY survives. Only for
 * non-virtualized lists (windowing legitimately creates and drops rows).
 */
function checkIdentity(
  list: LiveList,
  before: Map<string, Element>,
  beforeItems: ReadonlyMap<string, BItem>,
  world: BWorld,
): string | null {
  if (list.virtualize !== null) return null;
  const after = identityMap(list);
  for (const item of itemsOf(world)) {
    const prev = before.get(item.id);
    if (prev === undefined) continue;
    const sameRef = beforeItems.get(item.id) === item;
    if ((sameRef || list.mode === 'element') && after.get(item.id) !== prev) {
      return (
        `row ${item.id} was rebuilt although ` +
        (sameRef
          ? 'its item reference did not change'
          : 'element-mode rows keep their element across a key-preserving update')
      );
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export interface BCaseFailure {
  /** -1 for the initial bind, otherwise the index of the mutation that broke it. */
  step: number;
  kind: BViolationClass;
  message: string;
}

export function runBindListCase(
  spec: BindListSpec,
  mutations: readonly BMutation[],
): BCaseFailure | null {
  const frames = installFrames();
  const world = makeBWorld(spec);
  let state: RunState | null = null;
  try {
    try {
      const primary = createList(
        world,
        spec.mode,
        spec.rowSig,
        false,
        spec.before,
        spec.virtualize,
        0,
      );
      const twin = spec.twin
        ? createList(world, 'content', false, true, false, null, 0)
        : null;
      state = {
        world,
        primary,
        twin,
        frames,
        disposed: false,
        afterDispose: null,
        indexed: new Set(spec.ids),
      };
    } catch (err) {
      return {
        step: -1,
        kind: 'throw',
        message: `bindList() threw: ${String(err)}`,
      };
    }
    const initial = checkAll(state);
    if (initial !== null) return { step: -1, ...initial };

    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      const lists = liveLists(state);
      const before = lists.map((l) => identityMap(l));
      const beforeItems = new Map(itemsOf(world).map((it) => [it.id, it]));
      let threw: unknown = null;
      try {
        applyBMutation(m, state);
        flushFrames(frames);
      } catch (err) {
        threw = err;
        // Frames scheduled before the throw still run in a browser.
        try {
          flushFrames(frames);
        } catch {
          /* already recorded */
        }
      }
      const items = itemsOf(world);
      // A duplicate key is rejected before any render; everything else (a
      // poison item included) reached the controller's render.
      if (!state.disposed && uniqueKeys(items)) syncHeightModel(state, items);
      const anyInvalid = liveLists(state).some((l) => !listIsValid(l, items));
      if (threw !== null && !anyInvalid) {
        return {
          step: i,
          kind: 'throw',
          message: `${describeBMutation(m)} threw although the source is valid: ${String(threw)}`,
        };
      }
      const violation = checkAll(state);
      if (violation !== null) {
        return {
          step: i,
          kind: violation.kind,
          message: `after ${describeBMutation(m)}: ${violation.message}`,
        };
      }
      // Identity only when the step left the list in a valid, checked state.
      for (let l = 0; l < lists.length; l++) {
        const list = lists[l];
        if (list === state.primary && state.disposed) continue;
        if (!listIsValid(list, items)) continue;
        const idViolation = checkIdentity(list, before[l], beforeItems, world);
        if (idViolation !== null) {
          return {
            step: i,
            kind: 'content',
            message: `after ${describeBMutation(m)}: ${idViolation}`,
          };
        }
      }
    }
    return null;
  } finally {
    if (state !== null) {
      if (!state.disposed) state.primary.handle();
      state.primary.parent.remove();
      if (state.twin !== null) {
        state.twin.handle();
        state.twin.parent.remove();
      }
    }
    frames.restore();
  }
}

function liveLists(state: RunState): LiveList[] {
  const out: LiveList[] = [];
  if (!state.disposed) out.push(state.primary);
  if (state.twin !== null) out.push(state.twin);
  return out;
}

function checkAll(state: RunState): BViolation | null {
  const items = itemsOf(state.world);
  if (state.disposed && state.primary.parent.innerHTML !== state.afterDispose) {
    return {
      kind: 'content',
      message: "the disposed list's parent changed after dispose()",
    };
  }
  for (const list of liveLists(state)) {
    if (!listIsValid(list, items)) continue;
    const v = checkList(list, state.world, state.frames);
    if (v !== null) {
      const who = list === state.primary ? 'primary' : 'twin';
      return { kind: v.kind, message: `${who}: ${v.message}` };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Shrinking
// ---------------------------------------------------------------------------

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type Fails = (spec: BindListSpec, mutations: BMutation[]) => boolean;

function shrinkOnce(
  state: { spec: BindListSpec; mutations: BMutation[] },
  fails: Fails,
): boolean {
  let improved = false;
  for (let i = state.mutations.length - 1; i >= 0; i--) {
    const candidate = state.mutations.filter((_, j) => j !== i);
    if (fails(state.spec, candidate)) {
      state.mutations = candidate;
      improved = true;
    }
  }
  for (let i = 0; i < state.mutations.length; i++) {
    const m = state.mutations[i];
    if (m.k !== 'batch') continue;
    for (const sub of m.ms) {
      const candidate = state.mutations.slice();
      candidate[i] = sub;
      if (fails(state.spec, candidate)) {
        state.mutations = candidate;
        improved = true;
        break;
      }
    }
  }
  // Simplify the spec one field at a time.
  const simplifications: Array<(s: BindListSpec) => void> = [
    (s) => {
      s.twin = false;
    },
    (s) => {
      s.before = false;
    },
    (s) => {
      s.rowSig = false;
    },
    (s) => {
      s.virtualize = null;
    },
    (s) => {
      s.mode = 'content';
    },
    (s) => {
      if (s.virtualize !== null) s.virtualize.minRows = null;
    },
    (s) => {
      if (s.virtualize !== null) s.virtualize.overscan = 0;
    },
  ];
  for (const simplify of simplifications) {
    const candidate = clone(state.spec);
    simplify(candidate);
    if (
      JSON.stringify(candidate) !== JSON.stringify(state.spec) &&
      fails(candidate, state.mutations)
    ) {
      state.spec = candidate;
      improved = true;
    }
  }
  while (state.spec.ids.length > 0) {
    const candidate = clone(state.spec);
    candidate.ids.pop();
    if (!fails(candidate, state.mutations)) break;
    state.spec = candidate;
    improved = true;
  }
  return improved;
}

export interface ShrunkBCase {
  spec: BindListSpec;
  mutations: BMutation[];
  failure: BCaseFailure;
}

export function shrinkBindListCase(
  spec: BindListSpec,
  mutations: readonly BMutation[],
): ShrunkBCase {
  const original = runBindListCase(spec, mutations) as BCaseFailure;
  const fails: Fails = (s, ms) => {
    const f = runBindListCase(s, ms);
    return f !== null && f.kind === original.kind;
  };
  const state = {
    spec: clone(spec),
    mutations: clone(mutations) as BMutation[],
  };
  for (let round = 0; round < 6; round++) {
    if (!shrinkOnce(state, fails)) break;
  }
  return {
    spec: state.spec,
    mutations: state.mutations,
    failure: runBindListCase(state.spec, state.mutations) as BCaseFailure,
  };
}

export function formatBRepro(seed: number, shrunk: ShrunkBCase): string {
  const step =
    shrunk.failure.step === -1
      ? 'the initial bind'
      : `mutation #${shrunk.failure.step}`;
  return [
    `bindList fuzz failure (seed ${seed}) at ${step} [${shrunk.failure.kind}]:`,
    '',
    `  ${shrunk.failure.message}`,
    '',
    'Shrunk reproduction — paste into a regression test:',
    '',
    `  const spec = ${JSON.stringify(shrunk.spec)};`,
    `  const mutations = ${JSON.stringify(shrunk.mutations)};`,
    '  expect(runBindListCase(spec, mutations)).toBeNull();',
  ].join('\n');
}

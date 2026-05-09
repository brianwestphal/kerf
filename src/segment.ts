/**
 * `Segment` — kerf's structured render output.
 *
 * The JSX runtime emits a `SafeHtml` wrapping a `Segment`. Most renders
 * produce a single static segment (just an HTML string), which behaves
 * exactly like a string for backward compatibility. When the tree
 * contains a list (`each()`) or a parent whose children include a list,
 * the runtime emits a structured segment that `mount()` can dispatch
 * on — running its native keyed reconciler for the list parts and
 * leaving the static surrounds to the general-purpose diff.
 *
 * Why have a structured form at all: the perf bottleneck for huge
 * keyed lists isn't the per-row JSX work (which `each()` already
 * memoises). It's that flattening every render's whole tree to one
 * big HTML string forces a full `innerHTML` parse and a tree walk
 * over rows we know are unchanged. The segment shape lets mount()
 * skip both for the list parts.
 */

export type Segment = StaticSegment | ListSegment | MixedSegment;

export interface StaticSegment {
  kind: 'static';
  html: string;
}

export interface ListItem {
  /**
   * The row's object identity. Used by the reconciler to match new items
   * against live DOM nodes across renders. Unchanged ref → reuse the
   * existing live node; replaced ref → build a fresh node.
   */
  ref: object;
  /**
   * Optional cache-invalidation key that captures external state affecting
   * this row's render (e.g. selection class). Different cacheKey on the
   * same `ref` triggers a cache miss for that row. `undefined` when the
   * user didn't pass a `key` callback to `each()`.
   */
  cacheKey: unknown;
  html: string;
}

export interface ListSegment {
  kind: 'list';
  id: string;
  items: ListItem[];
  /**
   * Optional granular patches (KF-92). When present, the list reconciler
   * applies these directly to the existing binding instead of doing a
   * full classify+reconcile pass. Emitted by `each()` when bound to an
   * `arraySignal`. Mutually exclusive with the `items` snapshot in the
   * sense that the snapshot is treated as informational/fall-back when
   * patches are present.
   */
  patches?: ArrayPatchInternal[];
}

/**
 * Internal patch shape used inside list segments. Mirrors `ArrayPatch<T>`
 * from `array-signal.ts` but typed against `object` so the segment layer
 * doesn't need to be generic. `update` / `insert` patches carry the row's
 * pre-rendered HTML — `each()` renders them at JSX-evaluation time inside a
 * try/catch so a throwing render falls back to the snapshot path (KF-99)
 * instead of leaving the signal and DOM divergent.
 */
export type ArrayPatchInternal =
  | { type: 'update'; index: number; item: object; html: string }
  | { type: 'insert'; index: number; item: object; html: string }
  | { type: 'remove'; index: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'replace'; items: readonly object[] };

export interface MixedSegment {
  kind: 'mixed';
  parts: Segment[];
}

/**
 * Flatten a segment to a complete HTML string. Used for first render
 * (bulk innerHTML), for SSR-style consumption via `toString()`, and
 * for diagnostics.
 *
 * If `withMarkers` is set, list segments are wrapped in
 * `<!--kf-list:{id}-->` comments so the post-parse walk can find each
 * list's live parent. Plain (non-marker) flatten is what JSX consumers
 * see when they call `.toString()` on the SafeHtml.
 */
export function flatten(segment: Segment, withMarkers: boolean): string {
  if (segment.kind === 'static') return segment.html;
  if (segment.kind === 'list') {
    const items = segment.items.map((i) => i.html).join('');
    return withMarkers ? `<!--kf-list:${segment.id}-->${items}` : items;
  }
  return segment.parts.map((p) => flatten(p, withMarkers)).join('');
}

/**
 * Variant of `flatten` for the static-only diff path on subsequent
 * renders. Lists are reduced to a single marker comment with no items
 * inside — the actual list children stay in the live DOM and are
 * reconciled separately. Keeping list items out of this string is
 * what makes the morph cheap on huge lists where most rows are
 * unchanged.
 */
export function flattenWithoutListItems(segment: Segment): string {
  if (segment.kind === 'static') return segment.html;
  if (segment.kind === 'list') return `<!--kf-list:${segment.id}-->`;
  return segment.parts.map(flattenWithoutListItems).join('');
}

/** Collect every `ListSegment` in the tree, keyed by its id. */
export function collectLists(
  segment: Segment,
  out: Map<string, ListSegment> = new Map(),
): Map<string, ListSegment> {
  if (segment.kind === 'list') out.set(segment.id, segment);
  else if (segment.kind === 'mixed') {
    for (const part of segment.parts) collectLists(part, out);
  }
  return out;
}

/**
 * Combine a list of child segments into the smallest equivalent
 * representation: collapses adjacent statics into one static, returns
 * a single static if everything is static, otherwise a mixed segment
 * with statics coalesced.
 */
export function mergeChildSegments(parts: Segment[]): Segment {
  if (parts.length === 0) return { kind: 'static', html: '' };
  if (parts.every((p) => p.kind === 'static')) {
    return {
      kind: 'static',
      html: parts.map((p) => (p as StaticSegment).html).join(''),
    };
  }
  const merged: Segment[] = [];
  let coalesced = '';
  for (const p of parts) {
    if (p.kind === 'static') {
      coalesced += p.html;
    } else {
      if (coalesced !== '') {
        merged.push({ kind: 'static', html: coalesced });
        coalesced = '';
      }
      merged.push(p);
    }
  }
  if (coalesced !== '') merged.push({ kind: 'static', html: coalesced });
  return { kind: 'mixed', parts: merged };
}

/**
 * Wrap a child segment with surrounding open/close tags from the
 * parent JSX element. Used by the JSX runtime when constructing
 * `_jsx(tag, ...)` output.
 */
export function wrapWithTags(child: Segment, openTag: string, closeTag: string): Segment {
  if (child.kind === 'static') {
    return { kind: 'static', html: openTag + child.html + closeTag };
  }
  if (child.kind === 'mixed') {
    return {
      kind: 'mixed',
      parts: [
        { kind: 'static', html: openTag },
        ...child.parts,
        { kind: 'static', html: closeTag },
      ],
    };
  }
  return {
    kind: 'mixed',
    parts: [
      { kind: 'static', html: openTag },
      child,
      { kind: 'static', html: closeTag },
    ],
  };
}

/**
 * The fuzz harness's domain model: a JSON-serializable description of a kerf
 * tree, plus the live signal world it renders against.
 *
 * Everything the harness generates is data, never a closure. That is what makes
 * a failure reportable — a failing case prints as a `TreeSpec` + a `Mutation[]`
 * that can be pasted into a regression test verbatim.
 *
 * Shapes deliberately represented here, because each one is a seam where a real
 * defect has lived: a conditional sibling before a list, a list inside a
 * conditional, two lists over one source, keyed vs. call-order list identity,
 * fine-grained holes (global and row-scope) adjacent to list rows, `<svg>`
 * subtrees whose rows need namespace-aware parsing, and `data-morph-skip` /
 * `data-morph-preserve` islands sitting next to all of it.
 */
import { ArraySignal, arraySignal } from '../../../src/array-signal.js';
import { each, type SafeHtml, type Signal, signal } from '../../../src/index.js';
import { Fragment, jsx } from '../../../src/jsx-runtime.js';
import type { Rng } from './rng.js';

export interface Item {
  id: string;
  t: string;
}

/** How a list's data is held — the two reconcile paths kerf dispatches between. */
export type SourceKind = 'granular' | 'plain';

export interface SourceSpec {
  kind: SourceKind;
  ids: string[];
}

export interface ListSpec {
  /** Index into `TreeSpec.sources`. Two lists may share one source. */
  source: number;
  /** Stable identity, or null to depend on call order. */
  key: string | null;
  /** `li` in HTML context, `g` inside an `<svg>`. */
  rowTag: 'li' | 'g';
  /** Index into the signal pool for a row-scope fine-grained hole, or null. */
  rowSig: number | null;
}

export type NodeSpec =
  | { kind: 'text'; text: string }
  | { kind: 'hole'; sig: number; id: number }
  | { kind: 'list'; list: number }
  | { kind: 'cond'; cond: number; children: NodeSpec[] }
  | { kind: 'svg'; children: NodeSpec[] }
  | {
    kind: 'el';
    tag: string;
    dataKey: string | null;
    special: 'skip' | 'preserve' | null;
    boundAttr: { sig: number; id: number } | null;
    children: NodeSpec[];
  };

export interface TreeSpec {
  sigCount: number;
  condCount: number;
  sources: SourceSpec[];
  lists: ListSpec[];
  root: NodeSpec[];
}

export interface World {
  spec: TreeSpec;
  sigs: Signal<string>[];
  conds: Signal<boolean>[];
  sources: (ArraySignal<Item> | Signal<Item[]>)[];
}

// No `<p>`: the HTML parser auto-closes it before a block child, so a generated
// `<p><section>…` is reparented and the tree kerf renders is not the tree the
// spec describes. That is a real (documented separately) sharp edge for authors
// writing invalid nesting, but it is not what this harness is measuring.
const HTML_TAGS = ['div', 'section', 'span', 'ul'] as const;
const SVG_TAGS = ['g', 'defs'] as const;

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

interface GenCtx {
  rng: Rng;
  spec: TreeSpec;
  holeId: number;
  /** Lists still waiting to be placed somewhere in the tree. */
  pending: number[];
}

function makeItems(ids: readonly string[]): Item[] {
  return ids.map((id) => ({ id, t: id.toUpperCase() }));
}

/** A subtree is inert enough for `data-morph-skip` only if nothing in it updates. */
function isStatic(nodes: readonly NodeSpec[]): boolean {
  return nodes.every((n) => {
    if (n.kind === 'text') return true;
    if (n.kind === 'el') return n.boundAttr === null && isStatic(n.children);
    return false;
  });
}

function genChildren(ctx: GenCtx, depth: number, inSvg: boolean, inCond: boolean): NodeSpec[] {
  const count = ctx.rng.range(0, depth <= 0 ? 2 : 4);
  const out: NodeSpec[] = [];
  for (let i = 0; i < count; i++) out.push(genNode(ctx, depth, inSvg, inCond));
  return out;
}

function genNode(ctx: GenCtx, depth: number, inSvg: boolean, inCond: boolean): NodeSpec {
  const { rng } = ctx;
  // Place a pending list as soon as we're allowed to — an unplaced list would
  // make the spec describe a tree that renders nothing.
  if (ctx.pending.length > 0 && rng.bool(0.45)) {
    const list = ctx.pending.shift() as number;
    ctx.spec.lists[list].rowTag = inSvg ? 'g' : 'li';
    if (inSvg) ctx.spec.lists[list].rowSig = null;
    return { kind: 'list', list };
  }

  const roll = rng.next();
  if (depth <= 0 || roll < 0.22) {
    return { kind: 'text', text: `t${rng.int(100)}` };
  }
  if (roll < 0.36 && ctx.spec.sigCount > 0 && !inSvg) {
    return { kind: 'hole', sig: rng.int(ctx.spec.sigCount), id: ctx.holeId++ };
  }
  if (roll < 0.52 && ctx.spec.condCount > 0) {
    return {
      kind: 'cond',
      cond: rng.int(ctx.spec.condCount),
      children: genChildren(ctx, depth - 1, inSvg, true),
    };
  }
  if (roll < 0.60 && !inSvg && depth >= 2) {
    return { kind: 'svg', children: genChildren(ctx, depth - 1, true, inCond) };
  }

  const children = genChildren(ctx, depth - 1, inSvg, inCond);
  const boundAttr = !inSvg && ctx.spec.sigCount > 0 && rng.bool(0.25)
    ? { sig: rng.int(ctx.spec.sigCount), id: ctx.holeId++ }
    : null;
  // Not inside a conditional: both opt-outs are documented to let an element
  // outlive a template that stops emitting it, so a marked node in a branch that
  // is toggled off legitimately stays — behavior the liveness model would have
  // to special-case to no benefit.
  const special = !inCond && boundAttr === null && isStatic(children) && rng.bool(0.15)
    ? (rng.bool() ? 'skip' as const : 'preserve' as const)
    : null;
  return {
    kind: 'el',
    tag: inSvg ? rng.pick(SVG_TAGS) : rng.pick(HTML_TAGS),
    // A `data-key` is what lets morph pair a container across renders instead
    // of positionally matching a same-tag sibling into its place.
    dataKey: rng.bool(0.5) ? `k${rng.int(1000)}` : null,
    special,
    boundAttr,
    children,
  };
}

export function generateSpec(rng: Rng): TreeSpec {
  const sourceCount = rng.range(1, 3);
  const spec: TreeSpec = {
    sigCount: rng.range(1, 3),
    condCount: rng.range(1, 3),
    sources: Array.from({ length: sourceCount }, (_, s) => ({
      kind: rng.bool(0.6) ? 'granular' as const : 'plain' as const,
      ids: Array.from({ length: rng.range(0, 4) }, (_, i) => `s${s}i${i}`),
    })),
    // More lists than sources on purpose: two `each()` calls over one source is
    // the shape no data-identity scheme can separate.
    lists: [],
    root: [],
  };
  const listCount = rng.range(1, 4);
  for (let i = 0; i < listCount; i++) {
    spec.lists.push({
      source: rng.int(sourceCount),
      key: rng.bool(0.5) ? `L${i}` : null,
      rowTag: 'li',
      rowSig: rng.bool(0.35) ? rng.int(spec.sigCount) : null,
    });
  }

  const ctx: GenCtx = { rng, spec, holeId: 0, pending: spec.lists.map((_, i) => i) };
  spec.root = genChildren(ctx, 4, false, false);
  // Anything the random walk didn't find room for goes at the top level.
  while (ctx.pending.length > 0) {
    spec.root.push({ kind: 'list', list: ctx.pending.shift() as number });
  }
  return spec;
}

// ---------------------------------------------------------------------------
// Instantiation + rendering
// ---------------------------------------------------------------------------

export function makeWorld(spec: TreeSpec): World {
  return {
    spec,
    sigs: Array.from({ length: spec.sigCount }, (_, i) => signal(`v${i}`)),
    conds: Array.from({ length: spec.condCount }, () => signal(true)),
    sources: spec.sources.map((s) => (s.kind === 'granular'
      ? arraySignal(makeItems(s.ids))
      : signal(makeItems(s.ids)))),
  };
}

export function sourceItems(world: World, index: number): readonly Item[] {
  return world.sources[index].value;
}

/** What `renderNode` produces — structurally the JSX runtime's `Children`. */
type Rendered = SafeHtml | string | Rendered[];

function renderList(world: World, listIndex: number): SafeHtml {
  const list = world.spec.lists[listIndex];
  const src = world.sources[list.source];
  const rowSig = list.rowSig === null ? null : world.sigs[list.rowSig];
  const items = src instanceof ArraySignal ? src : src.value;
  const render = (item: Item): SafeHtml => jsx(list.rowTag, {
    'data-list': String(listIndex),
    // Row keys are namespaced by list: `data-key` is documented to be unique
    // among siblings, and two lists over one source rendering into one parent
    // would otherwise collide by construction rather than by defect.
    'data-key': `L${listIndex}_${item.id}`,
    children: rowSig === null
      ? item.t
      : [item.t, jsx(list.rowTag === 'g' ? 'text' : 'span', {
        'data-rowhole': String(listIndex),
        children: rowSig,
      })],
  });
  return list.key === null ? each(items, render) : each(items, render, { key: list.key });
}

function renderNode(node: NodeSpec, world: World): Rendered {
  switch (node.kind) {
    case 'text':
      return node.text;
    case 'hole':
      return jsx('span', { 'data-hole': String(node.id), children: world.sigs[node.sig] });
    case 'list':
      return renderList(world, node.list);
    case 'cond':
      return world.conds[node.cond].value
        ? node.children.map((c) => renderNode(c, world))
        : '';
    case 'svg':
      return jsx('svg', { children: node.children.map((c) => renderNode(c, world)) });
    case 'el': {
      const props: Record<string, unknown> = {
        children: node.children.map((c) => renderNode(c, world)),
      };
      if (node.dataKey !== null) props['data-key'] = node.dataKey;
      if (node.special === 'skip') props['data-morph-skip'] = true;
      if (node.special === 'preserve') props['data-morph-preserve'] = true;
      if (node.boundAttr !== null) {
        props['data-battr'] = String(node.boundAttr.id);
        props.class = world.sigs[node.boundAttr.sig];
      }
      return jsx(node.tag, props);
    }
  }
}

export function makeRender(world: World): () => SafeHtml {
  return () => jsx(Fragment, { children: world.spec.root.map((n) => renderNode(n, world)) });
}

// ---------------------------------------------------------------------------
// Liveness — which lists / holes the current cond values actually render
// ---------------------------------------------------------------------------

export interface Liveness {
  lists: Set<number>;
  holes: Map<number, number>;
  attrs: Map<number, number>;
  /** Lists whose rows live inside an `<svg>`, so their nodes must be SVG-namespaced. */
  svgLists: Set<number>;
}

export function liveness(world: World): Liveness {
  const out: Liveness = {
    lists: new Set(),
    holes: new Map(),
    attrs: new Map(),
    svgLists: new Set(),
  };
  const walk = (nodes: readonly NodeSpec[], inSvg: boolean): void => {
    for (const n of nodes) {
      switch (n.kind) {
        case 'list':
          out.lists.add(n.list);
          if (inSvg) out.svgLists.add(n.list);
          break;
        case 'hole':
          out.holes.set(n.id, n.sig);
          break;
        case 'cond':
          if (world.conds[n.cond].value) walk(n.children, inSvg);
          break;
        case 'svg':
          walk(n.children, true);
          break;
        case 'el':
          if (n.boundAttr !== null) out.attrs.set(n.boundAttr.id, n.boundAttr.sig);
          // A morph-skipped subtree is frozen after the first paint by design,
          // and generation guarantees it holds nothing dynamic — nothing under
          // it is worth asserting on.
          if (n.special !== 'skip') walk(n.children, inSvg);
          break;
        case 'text':
          break;
      }
    }
  };
  walk(world.spec.root, false);
  return out;
}

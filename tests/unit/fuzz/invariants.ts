/**
 * The properties every reconcile must preserve, checked after every mutation.
 *
 * The strongest one by far is `differentialSnapshot`: render the *same* spec and
 * the *same* state into a fresh mount and require the incrementally-reconciled
 * DOM to be structurally identical to it. Incremental and from-scratch must
 * agree — that single property subsumes most hand-written assertions, and it is
 * the one that would have caught the wrong-list corruption, the stranded rows,
 * and the SVG namespace bug without anyone having predicted those shapes.
 *
 * The targeted checks below it exist because a differential mismatch says
 * "something differs" while a targeted failure says what. Both are worth having.
 */
import { mount } from '../../../src/index.js';
import { type Liveness, liveness, makeRender, makeWorld, sourceItems, type World } from './model.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

const SVG_NS = 'http://www.w3.org/2000/svg';
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

/** Binding and list-marker ids are allocation order, not meaning — erase them. */
function normalizeIds(text: string): string {
  return text.replace(/\b(kfb|kfbr|kf-list):\d+/g, '$1:#').replace(/^\d+(,\d+)*$/, '#');
}

/**
 * A structural projection of a subtree: tags with namespace, sorted attributes,
 * merged adjacent text, normalized comments. Attribute *order* and text-node
 * *splitting* are not user-visible, so normalizing them out keeps the
 * differential check free of false alarms while leaving every real difference.
 */
export function snapshot(root: Element): string {
  const out: string[] = [];
  const walk = (node: Node, depth: number): void => {
    const pad = '  '.repeat(depth);
    if (node.nodeType === ELEMENT_NODE) {
      const el = node as Element;
      const attrs = Array.from(el.attributes)
        .map((a) => `${a.name}="${normalizeIds(a.value)}"`)
        .sort()
        .join(' ');
      const ns = el.namespaceURI === SVG_NS ? '@svg' : '';
      out.push(`${pad}<${el.tagName.toLowerCase()}${ns} ${attrs}>`);
      walkChildren(el, depth + 1);
      return;
    }
    if (node.nodeType === COMMENT_NODE) {
      out.push(`${pad}<!--${normalizeIds(node.nodeValue ?? '')}-->`);
    }
  };
  const walkChildren = (parent: Node, depth: number): void => {
    const pad = '  '.repeat(depth);
    let text = '';
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === TEXT_NODE) {
        text += child.nodeValue ?? '';
        continue;
      }
      if (text !== '') { out.push(`${pad}#text ${JSON.stringify(text)}`); text = ''; }
      walk(child, depth);
    }
    if (text !== '') out.push(`${pad}#text ${JSON.stringify(text)}`);
  };
  walkChildren(root, 0);
  return out.join('\n');
}

/** Copy a world's live state onto a second world instantiated from the same spec. */
function cloneState(from: World, to: World): void {
  from.sigs.forEach((s, i) => { to.sigs[i].value = s.value; });
  from.conds.forEach((c, i) => { to.conds[i].value = c.value; });
  from.sources.forEach((src, i) => {
    const items = src.value.map((it) => ({ ...it }));
    const target = to.sources[i] as { replace?: (v: readonly unknown[]) => void; value: unknown };
    if (typeof target.replace === 'function') target.replace(items);
    else target.value = items;
  });
}

/**
 * How a violation is classified. The distinction exists so the gate can hold a
 * precise line against *known-open* defects without blinding itself to new
 * ones — see `KNOWN_OPEN` in the test entry.
 */
export type ViolationClass = 'content' | 'marker-drift' | 'structure';

export interface Violation {
  message: string;
  kind: ViolationClass;
}

const withoutListMarkers = (snap: string): string =>
  snap.split('\n').filter((line) => !line.trimStart().startsWith('<!--kf-list:')).join('\n');

/**
 * Property: incremental reconcile == from-scratch render, for the same state.
 * Returns a diff description, or null when they agree.
 */
export function differentialSnapshot(live: Element, world: World): Violation | null {
  const fresh = document.createElement('div');
  document.body.appendChild(fresh);
  let dispose: (() => void) | null = null;
  try {
    const freshWorld = makeWorld(world.spec);
    cloneState(world, freshWorld);
    dispose = mount(fresh, makeRender(freshWorld));
    const got = snapshot(live);
    const want = snapshot(fresh);
    if (got === want) return null;
    // Everything except where the list markers sit? Then the rendered result is
    // right and only the region bookkeeping drifted — a materially different
    // (and less severe) finding than rows being wrong, so classify it apart.
    const kind: ViolationClass = withoutListMarkers(got) === withoutListMarkers(want)
      ? 'marker-drift'
      : 'structure';
    return {
      kind,
      message: `incremental DOM differs from a from-scratch render of the same state`
        + ` (${kind})\n--- from-scratch (expected)\n${want}\n--- incremental (actual)\n${got}`,
    };
  } finally {
    dispose?.();
    fresh.remove();
  }
}

function rowsOf(root: Element, list: number): Element[] {
  return Array.from(root.querySelectorAll(`[data-list="${list}"]`));
}

/** Every row node currently in the tree, indexed by `list/key`. */
export function rowIdentityMap(root: Element, world: World): Map<string, Element> {
  const map = new Map<string, Element>();
  world.spec.lists.forEach((_, list) => {
    for (const row of rowsOf(root, list)) {
      map.set(`${list}/${row.getAttribute('data-key') ?? '?'}`, row);
    }
  });
  return map;
}

function checkLists(root: Element, world: World, live: Liveness): string | null {
  for (let list = 0; list < world.spec.lists.length; list++) {
    const spec = world.spec.lists[list];
    const rows = rowsOf(root, list);
    const expected = live.lists.has(list) ? sourceItems(world, spec.source) : [];

    if (rows.length !== expected.length) {
      return `list ${list}: expected ${expected.length} rows, found ${rows.length}`
        + ` [${rows.map((r) => r.getAttribute('data-key')).join(',')}]`
        + ` vs [${expected.map((i) => i.id).join(',')}]`;
    }
    for (let i = 0; i < rows.length; i++) {
      const key = rows[i].getAttribute('data-key');
      const wantKey = `L${list}_${expected[i].id}`;
      if (key !== wantKey) {
        return `list ${list} row ${i}: key "${key}" but source says "${wantKey}"`;
      }
      const rowSigValue = spec.rowSig === null ? '' : world.sigs[spec.rowSig].value;
      const want = expected[i].t + rowSigValue;
      if (rows[i].textContent !== want) {
        return `list ${list} row ${i} (${key}): text ${JSON.stringify(rows[i].textContent)}`
          + ` but expected ${JSON.stringify(want)}`;
      }
    }
    if (live.svgLists.has(list)) {
      for (const row of rows) {
        if (row.namespaceURI !== SVG_NS) {
          return `list ${list}: row <${row.tagName}> inside <svg> has namespace `
            + `${String(row.namespaceURI)}, expected the SVG namespace`;
        }
      }
    }
  }
  return null;
}

function checkHoles(root: Element, world: World, live: Liveness): string | null {
  const seen = new Set<string>();
  for (const [id, sig] of live.holes) {
    const el = root.querySelector(`[data-hole="${id}"]`);
    if (el === null) return `bound text hole ${id} is missing from the DOM`;
    seen.add(String(id));
    if (el.textContent !== world.sigs[sig].value) {
      return `bound text hole ${id}: ${JSON.stringify(el.textContent)}`
        + ` but signal holds ${JSON.stringify(world.sigs[sig].value)}`;
    }
  }
  for (const el of Array.from(root.querySelectorAll('[data-hole]'))) {
    const id = el.getAttribute('data-hole') ?? '';
    if (!seen.has(id)) return `bound text hole ${id} is in the DOM but its branch is not rendered`;
  }

  for (const [id, sig] of live.attrs) {
    const el = root.querySelector(`[data-battr="${id}"]`);
    if (el === null) return `bound attribute host ${id} is missing from the DOM`;
    if (el.getAttribute('class') !== world.sigs[sig].value) {
      return `bound attribute ${id}: class=${JSON.stringify(el.getAttribute('class'))}`
        + ` but signal holds ${JSON.stringify(world.sigs[sig].value)}`;
    }
  }
  return null;
}

function checkSvgNamespaces(root: Element): string | null {
  for (const svg of Array.from(root.querySelectorAll('svg'))) {
    for (const el of Array.from(svg.querySelectorAll('*'))) {
      if (el.namespaceURI !== SVG_NS) {
        return `<${el.tagName}> under an <svg> has namespace ${String(el.namespaceURI)},`
          + ' expected the SVG namespace';
      }
    }
  }
  return null;
}

/**
 * Run every invariant. Returns the first violation's description, or null.
 * Ordered cheapest-and-most-specific first so a report names the actual defect
 * rather than only "the trees differ".
 */
export function checkInvariants(root: Element, world: World): Violation | null {
  const live = liveness(world);
  const targeted = checkLists(root, world, live)
    ?? checkHoles(root, world, live)
    ?? checkSvgNamespaces(root);
  if (targeted !== null) return { kind: 'content', message: targeted };
  // Triage knob: `KERF_FUZZ_DIFF=0` drops the differential check and leaves only
  // the user-visible ones, which answers "is this structural drift or does it
  // actually render wrong?" without editing the harness.
  return env.KERF_FUZZ_DIFF === '0' ? null : differentialSnapshot(root, world);
}

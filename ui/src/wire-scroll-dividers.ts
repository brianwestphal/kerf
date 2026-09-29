/**
 * An app-owned scroll arrangement outside a `Pane`: the `id` of the element
 * that scrolls and the `id`s of the pinned chrome on each physical side of it.
 * Each named chrome element shows its divider on the side facing the scroller
 * while content is scrolled away beyond that side. Ids are resolved below the
 * wired root on every refresh, so a re-render that replaces an element keeps
 * the pairing.
 */
export interface ScrollDividerTarget {
  /** The `id` of the scrolling element. */
  scroller: string;
  /** Chrome above the scroller: shows its bottom divider once scrolled down. */
  top?: string;
  /**
   * Chrome right of the scroller: shows its left divider while content is
   * hidden beyond the scroller's right edge (never when nothing overflows).
   */
  right?: string;
  /**
   * Chrome below the scroller: shows its top divider while content is hidden
   * beyond the scroller's bottom edge (never when nothing overflows).
   */
  bottom?: string;
  /** Chrome left of the scroller: shows its right divider once scrolled right. */
  left?: string;
}

export interface WireScrollDividersOptions {
  /**
   * App-owned scroll arrangements to pair beyond the ones found by structure
   * (every `Pane`'s header and footer around its content, and every `TabBar`
   * strip).
   */
  targets?: readonly ScrollDividerTarget[];
}

type Edge = 't' | 'r' | 'b' | 'l';

const EDGES: readonly Edge[] = ['t', 'r', 'b', 'l'];

/** The side of a chrome element that faces a scroller it sits on `edge` of. */
const FACING: Record<Edge, Edge> = { t: 'b', r: 'l', b: 't', l: 'r' };

const TARGET_EDGES: Record<Edge, 'top' | 'right' | 'bottom' | 'left'> = {
  t: 'top',
  r: 'right',
  b: 'bottom',
  l: 'left',
};

/** On a scroller: the edges beyond which content is currently hidden. */
const SCROLL_OVERFLOW = 'data-scroll-overflow';
/** On a chrome element: its sides that currently show a scroll divider. */
const SCROLL_DIVIDER = 'data-scroll-divider';

/**
 * Scroll distance, in px, that must be exceeded to count as "away from an
 * edge": `scrollWidth`/`scrollHeight` are rounded to whole pixels while the
 * scroll position is fractional, so a scroller at its end can report up to a
 * pixel still to go.
 */
const THRESHOLD = 1;

interface Pairing {
  scroller: HTMLElement;
  chrome: Partial<Record<Edge, HTMLElement>>;
}

/** A double-quoted CSS attribute-selector value. */
const quoted = (value: string) =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

/** Elements matching `selector` at and below root. */
function within<T extends Element>(
  root: HTMLElement | Document,
  selector: string,
): T[] {
  const found = [...root.querySelectorAll<T>(selector)];
  if (root.nodeType === 1 && (root as HTMLElement).matches(selector))
    found.unshift(root as unknown as T);
  return found;
}

const directChild = (parent: Element, selector: string) =>
  [...parent.children].find((child): child is HTMLElement =>
    child.matches(selector),
  );

/** Canonical top/right/bottom/left string of the given edges. */
const sides = (edges: ReadonlySet<Edge>) =>
  EDGES.filter((edge) => edges.has(edge)).join('');

/**
 * Which edges of `scroller` currently have content hidden beyond them. Nothing
 * overflows when the content fits, so the far edges report no divider then.
 * Horizontal edges are physical, so a right-to-left scroller (whose
 * `scrollLeft` runs from the negative maximum to 0) reports the same sides.
 */
function measure(scroller: HTMLElement): string {
  const edges = new Set<Edge>();
  const maxY = scroller.scrollHeight - scroller.clientHeight;
  if (maxY > THRESHOLD) {
    if (scroller.scrollTop > THRESHOLD) edges.add('t');
    if (maxY - scroller.scrollTop > THRESHOLD) edges.add('b');
  }
  const maxX = scroller.scrollWidth - scroller.clientWidth;
  if (maxX > THRESHOLD) {
    const view = scroller.ownerDocument.defaultView;
    const rtl = view?.getComputedStyle(scroller).direction === 'rtl';
    const left = rtl ? maxX + scroller.scrollLeft : scroller.scrollLeft;
    if (left > THRESHOLD) edges.add('l');
    if (maxX - left > THRESHOLD) edges.add('r');
  }
  return sides(edges);
}

type StateAttribute = typeof SCROLL_OVERFLOW | typeof SCROLL_DIVIDER;

/** Set (or, for an empty value, remove) one of this wiring's attributes. */
function write(element: Element, name: StateAttribute, value: string) {
  if (element.getAttribute(name) === (value || null)) return;
  if (name === SCROLL_OVERFLOW) {
    if (value) element.setAttribute(SCROLL_OVERFLOW, value);
    else element.removeAttribute(SCROLL_OVERFLOW);
  } else if (value) element.setAttribute(SCROLL_DIVIDER, value);
  else element.removeAttribute(SCROLL_DIVIDER);
}

/**
 * Wire scroll dividers below `root`: a divider between pinned chrome and the
 * content that scrolls beside it shows only while content is scrolled away
 * from that edge. Near edges (top, left) hide at the scroll start; far edges
 * (bottom, right) hide at the scroll end and whenever nothing overflows.
 *
 * The wiring only reports scroll state; each component draws its own divider
 * from it. It writes `data-scroll-overflow` (the edges with hidden content, in
 * canonical `t`/`r`/`b`/`l` order) on each scroller, and `data-scroll-divider`
 * (the sides to draw) on each paired chrome element:
 *
 * - every `Pane` with a header or footer: its header shows a bottom divider and
 *   its footer a top divider (drawn by the Pane, per its `chromeDividers`);
 * - every `TabBar` strip: the bar draws a divider on each side of the strip
 *   whose tabs are scrolled out of view;
 * - each app-owned `targets` pairing: a `Toolbar` or `List` named as chrome
 *   draws the divider on its facing side.
 *
 * Structure is re-read after every DOM change below root (a re-render that
 * drops the attributes gets them back before paint), scroll is tracked with
 * one capturing listener, and size changes of each scroller and its children
 * with a `ResizeObserver`. Returns a disposer that removes every attribute it
 * wrote. See `docs/23-app-layouts.md` §3.7.
 */
export function wireScrollDividers(
  root: HTMLElement | Document,
  { targets = [] }: WireScrollDividersOptions = {},
): () => void {
  const ownerDocument = (
    root.nodeType === 9 ? (root as Document) : root.ownerDocument
  )!;
  const view = ownerDocument.defaultView;
  let disposed = false;
  let pairings: Pairing[] = [];
  const overflow = new Map<HTMLElement, string>();
  /** Every element this wiring has written, with what it wrote. */
  const written = new Map<Element, Map<StateAttribute, string>>();

  const byId = (id: string | undefined) => {
    if (!id) return undefined;
    const [match] = within<HTMLElement>(root, `[id=${quoted(id)}]`);
    return match;
  };

  const collect = (): Pairing[] => {
    const found: Pairing[] = [];
    for (const pane of within<HTMLElement>(root, '.kui-pane')) {
      const scroller = directChild(pane, '.kui-pane__content');
      const header = directChild(pane, '.kui-pane__header, .kui-pane__toolbar');
      const footer = directChild(pane, '.kui-pane__footer');
      if (scroller && (header || footer))
        found.push({ scroller, chrome: { t: header, b: footer } });
    }
    for (const strip of within<HTMLElement>(root, '[data-kui-tab-list]'))
      found.push({ scroller: strip, chrome: {} });
    for (const target of targets) {
      const scroller = byId(target.scroller);
      if (!scroller) continue;
      const chrome: Pairing['chrome'] = {};
      for (const edge of EDGES) chrome[edge] = byId(target[TARGET_EDGES[edge]]);
      found.push({ scroller, chrome });
    }
    return found;
  };

  /** Write every paired element's attributes from the measured overflow. */
  const apply = () => {
    const current = new Map<Element, Map<StateAttribute, string>>();
    const dividers = new Map<HTMLElement, Set<Edge>>();
    for (const { scroller, chrome } of pairings) {
      const edges = overflow.get(scroller)!;
      (
        current.get(scroller) ?? current.set(scroller, new Map()).get(scroller)!
      ).set(SCROLL_OVERFLOW, edges);
      for (const edge of EDGES) {
        const element = chrome[edge];
        if (!element) continue;
        const shown = dividers.get(element) ?? new Set<Edge>();
        dividers.set(element, shown);
        if (edges.includes(edge)) shown.add(FACING[edge]);
      }
    }
    for (const [element, shown] of dividers)
      (
        current.get(element) ?? current.set(element, new Map()).get(element)!
      ).set(SCROLL_DIVIDER, sides(shown));
    // Anything written before that is no longer paired gets its attributes back.
    for (const [element, values] of written)
      for (const name of values.keys())
        if (!current.get(element)?.has(name)) write(element, name, '');
    written.clear();
    for (const [element, values] of current) {
      written.set(element, values);
      for (const [name, value] of values) write(element, name, value);
    }
  };

  const observed = new Set<Element>();
  const resizeObserver = view?.ResizeObserver
    ? new view.ResizeObserver((entries) => {
        if (disposed) return;
        const scrollers = new Set(pairings.map(({ scroller }) => scroller));
        for (const { target } of entries) {
          const scroller = scrollers.has(target as HTMLElement)
            ? (target as HTMLElement)
            : target.parentElement;
          if (scroller && scrollers.has(scroller))
            overflow.set(scroller, measure(scroller));
        }
        apply();
      })
    : undefined;

  const observeSizes = () => {
    if (!resizeObserver) return;
    const wanted = new Set<Element>();
    for (const { scroller } of pairings) {
      wanted.add(scroller);
      for (const child of scroller.children) wanted.add(child);
    }
    for (const element of observed)
      if (!wanted.has(element)) {
        resizeObserver.unobserve(element);
        observed.delete(element);
      }
    for (const element of wanted)
      if (!observed.has(element)) {
        resizeObserver.observe(element);
        observed.add(element);
      }
  };

  const refresh = () => {
    pairings = collect();
    overflow.clear();
    for (const { scroller } of pairings)
      overflow.set(scroller, measure(scroller));
    observeSizes();
    apply();
  };

  const onScroll = (event: Event) => {
    const scroller = event.target as HTMLElement;
    if (!overflow.has(scroller)) return;
    const edges = measure(scroller);
    if (edges === overflow.get(scroller)) return;
    overflow.set(scroller, edges);
    apply();
  };

  const mutationObserver = view?.MutationObserver
    ? new view.MutationObserver((records) => {
        // A re-render that only dropped or changed attributes this wiring
        // owns gets them back without re-measuring; structure changes
        // re-read every pairing.
        if (
          records.every(
            ({ type, attributeName }) =>
              type === 'attributes' &&
              (attributeName === SCROLL_OVERFLOW ||
                attributeName === SCROLL_DIVIDER),
          )
        )
          apply();
        else refresh();
      })
    : undefined;

  refresh();
  root.addEventListener('scroll', onScroll, { capture: true, passive: true });
  mutationObserver?.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [SCROLL_OVERFLOW, SCROLL_DIVIDER, 'id', 'class'],
  });

  return () => {
    if (disposed) return;
    disposed = true;
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    root.removeEventListener('scroll', onScroll, { capture: true });
    for (const [element, values] of written)
      for (const name of values.keys()) write(element, name, '');
    written.clear();
    overflow.clear();
    observed.clear();
    pairings = [];
  };
}

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
   * (every `Pane`'s header and footer around its content, every `NavStack`'s
   * and `TabNavigator`'s chrome around its active region, and every `TabBar`
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

const PANE_CHROME = {
  t: '.kui-pane__header, .kui-pane__toolbar',
  b: '.kui-pane__footer',
} as const;

/** A NavStack's live (not cross-fading copy) chrome on `edge`. */
const NAV_STACK_CHROME = {
  t: '.kui-nav-stack__chrome:not([data-nav-chrome-copy])',
  b: '.kui-nav-stack__bottom:not([data-nav-chrome-copy])',
} as const;

/** A NavStack's active view: the top entry, never one sliding out. */
function activeView(stack: Element): HTMLElement | undefined {
  const viewport = directChild(stack, '.kui-nav-stack__viewport');
  if (!viewport) return undefined;
  return [...viewport.children]
    .filter((child): child is HTMLElement =>
      child.matches(
        '.kui-nav-stack__view[data-nav-active="true"]:not([data-nav-exiting="true"])',
      ),
    )
    .at(-1);
}

/** A TabNavigator's shown scene. */
function activeScene(scaffold: Element): HTMLElement | undefined {
  const scenes = directChild(scaffold, '.kui-tab-scaffold__scenes');
  return scenes
    ? directChild(scenes, '.kui-tab-scaffold__scene[data-active="true"]')
    : undefined;
}

/**
 * The elements that may scroll against a layout region's `edge` (the top or
 * bottom of a NavStack view or a TabNavigator scene): the region itself, then,
 * through a sole child that puts no chrome of its own on that edge, a Pane's
 * content slot or a nested NavStack's or TabNavigator's active region. Every
 * candidate is paired with the layout's chrome; one that does not overflow
 * reports nothing, so the chrome keys on whichever element actually scrolls.
 * A sole child with chrome on that edge (a Pane header, a nested NavStack's
 * top chrome, a TabNavigator's bar) stops the walk: that chrome draws its own
 * divider against its own content.
 */
function regionScrollers(region: HTMLElement, edge: 't' | 'b'): HTMLElement[] {
  const found: HTMLElement[] = [];
  let current: HTMLElement | undefined = region;
  while (current) {
    found.push(current);
    if (current.children.length !== 1) break;
    const child: Element = current.children[0]!;
    if (child.matches('.kui-pane')) {
      current = directChild(child, PANE_CHROME[edge])
        ? undefined
        : directChild(child, '.kui-pane__content');
      if (current) found.push(current);
      break;
    }
    if (child.matches('.kui-nav-stack'))
      current = directChild(child, NAV_STACK_CHROME[edge])
        ? undefined
        : activeView(child);
    else if (child.matches('.kui-tab-scaffold') && edge === 't')
      current = activeScene(child);
    else current = undefined;
  }
  return found;
}

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
type Root = HTMLElement | Document;

interface Registration {
  root: Root;
  targets: readonly ScrollDividerTarget[];
}

// A document has one attribute writer even when registrations overlap. The
// WeakMap ties this coordination cache to the document's lifetime.
const CONTROLLERS = new WeakMap<
  Document,
  (registration: Registration) => () => void
>();

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
 * - every `NavStack`'s top chrome and bottom toolbar around its active view,
 *   and every `TabNavigator`'s bar under its active scene: the chrome shows a
 *   bottom (top chrome) or top (bottom toolbar, bar) divider. The scroller is
 *   whichever element actually scrolls there: the view or scene itself, or,
 *   through a sole child with no chrome of its own on that edge, a `Pane`'s
 *   content or a nested `NavStack` / `TabNavigator` region (a Pane's own header
 *   or footer draws that boundary instead);
 * - every `TabBar` strip: the bar draws a divider on each side of the strip
 *   whose tabs are scrolled out of view;
 * - each app-owned `targets` pairing: a `Toolbar` or `List` named as chrome
 *   draws the divider on its facing side.
 *
 * Structure is re-read after every DOM change below root (a re-render that
 * drops the attributes gets them back before paint), scroll is tracked with
 * one capturing listener per registered root, and size changes of each
 * scroller and its children with a `ResizeObserver`. Overlapping registrations
 * share one attribute writer; each disposer removes its registration, and the
 * final disposer removes the wiring-owned attributes. See
 * `docs/23-app-layouts.md` §3.7.
 */
export function wireScrollDividers(
  root: Root,
  { targets = [] }: WireScrollDividersOptions = {},
): () => void {
  const ownerDocument = (
    root.nodeType === 9 ? (root as Document) : root.ownerDocument
  )!;
  let register = CONTROLLERS.get(ownerDocument);
  if (!register) {
    register = createController(ownerDocument);
    CONTROLLERS.set(ownerDocument, register);
  }
  return register({ root, targets });
}

function createController(
  ownerDocument: Document,
): (registration: Registration) => () => void {
  const view = ownerDocument.defaultView;
  let disposed = false;
  const registrations = new Set<Registration>();
  const listenedRoots = new Set<Root>();
  let pairings: Pairing[] = [];
  const overflow = new Map<HTMLElement, string>();
  /** Every element this wiring has written, with what it wrote. */
  const written = new Map<Element, Map<StateAttribute, string>>();

  const byId = (root: Root, id: string | undefined) => {
    if (!id) return undefined;
    const [match] = within<HTMLElement>(root, `[id=${quoted(id)}]`);
    return match;
  };

  const collect = (): Pairing[] => {
    const found: Pairing[] = [];
    for (const { root, targets } of registrations) {
      for (const pane of within<HTMLElement>(root, '.kui-pane')) {
        const scroller = directChild(pane, '.kui-pane__content');
        const header = directChild(pane, PANE_CHROME.t);
        const footer = directChild(pane, PANE_CHROME.b);
        if (scroller && (header || footer))
          found.push({ scroller, chrome: { t: header, b: footer } });
      }
      const pairRegion = (
        region: HTMLElement | undefined,
        edge: 't' | 'b',
        chrome: HTMLElement | undefined,
      ) => {
        if (!region || !chrome) return;
        for (const scroller of regionScrollers(region, edge))
          found.push({ scroller, chrome: { [edge]: chrome } });
      };
      for (const stack of within<HTMLElement>(root, '.kui-nav-stack')) {
        const view = activeView(stack);
        for (const edge of ['t', 'b'] as const)
          pairRegion(view, edge, directChild(stack, NAV_STACK_CHROME[edge]));
      }
      for (const scaffold of within<HTMLElement>(root, '.kui-tab-scaffold'))
        pairRegion(
          activeScene(scaffold),
          'b',
          directChild(scaffold, '.kui-tab-scaffold__bar'),
        );
      for (const strip of within<HTMLElement>(root, '[data-kui-tab-list]'))
        found.push({ scroller: strip, chrome: {} });
      for (const target of targets) {
        const scroller = byId(root, target.scroller);
        if (!scroller) continue;
        const chrome: Pairing['chrome'] = {};
        for (const edge of EDGES)
          chrome[edge] = byId(root, target[TARGET_EDGES[edge]]);
        found.push({ scroller, chrome });
      }
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
        if (disposed) return;
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

  const syncRoots = () => {
    const roots = new Set([...registrations].map(({ root }) => root));
    for (const root of listenedRoots)
      if (!roots.has(root)) {
        root.removeEventListener('scroll', onScroll, { capture: true });
        listenedRoots.delete(root);
      }
    for (const root of roots)
      if (!listenedRoots.has(root)) {
        root.addEventListener('scroll', onScroll, {
          capture: true,
          passive: true,
        });
        listenedRoots.add(root);
      }
    mutationObserver?.disconnect();
    for (const root of roots)
      mutationObserver?.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        // The shown NavStack view and TabNavigator scene change by attribute.
        attributeFilter: [
          SCROLL_OVERFLOW,
          SCROLL_DIVIDER,
          'id',
          'class',
          'data-nav-active',
          'data-nav-exiting',
          'data-active',
        ],
      });
  };

  return (registration) => {
    registrations.add(registration);
    syncRoots();
    refresh();
    return () => {
      if (!registrations.delete(registration)) return;
      syncRoots();
      if (registrations.size) refresh();
      else {
        disposed = true;
        resizeObserver?.disconnect();
        for (const [element, values] of written)
          for (const name of values.keys()) write(element, name, '');
        written.clear();
        overflow.clear();
        observed.clear();
        pairings = [];
        CONTROLLERS.delete(ownerDocument);
      }
    };
  };
}

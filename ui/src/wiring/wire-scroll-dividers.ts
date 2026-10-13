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

/** On a Pane with an overlay header: the wiring has measured that header. */
const HEADER_OVERLAY = 'data-header-overlay';
/** The inherited clearance context a measured overlay header publishes. */
const CLEARANCE_BLOCK_START = '--kui-scroll-clearance-block-start';
/**
 * On a Pane with a measured overlay header: the inline size of its content's
 * classic vertical scrollbar, which the header leaves uncovered. Unset for an
 * overlay scrollbar, which takes no space.
 */
const SCROLLBAR_INLINE_SIZE = '--kui-pane-scrollbar-inline-size';
/** A Pane whose header is laid over its content (fixed chrome only). */
const OVERLAY_PANE =
  '.kui-pane[data-header-presentation="overlay"]:not([data-chrome-placement="auto"])';

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
 * It also measures every `Pane` header laid over its content
 * (`headerPresentation="overlay"`, with fixed chrome placement): it publishes
 * the header's border-box block size on the Pane root as the inherited
 * `--kui-scroll-clearance-block-start` context, and marks the root
 * `data-header-overlay="measured"`, which moves the header over the content
 * and has the content clear it. The measurement follows the header as it
 * wraps, zooms, or changes content, and both are restored before paint if a
 * re-render drops them.
 *
 * Structure is re-read after every DOM change below root that can change a
 * pairing — a structural element or target id added, removed, or re-classed;
 * mutations inside scrolled content (a row's class, a list's rows) do not
 * re-read it. Either way the scrollers are re-measured once the next frame
 * has laid out, before it paints, so a large render never forces a layout
 * (where `ResizeObserver` is missing, structure is measured at once and
 * content in the next animation frame) — and a re-render that drops the
 * attributes gets them back before paint.
 * Scroll is tracked with one capturing listener per registered root, and size
 * changes of each scroller and its children with a `ResizeObserver`. Overlapping registrations
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

/**
 * Every class `collect()` and `regionScrollers()` select by. An element that
 * carries none of them (and no target id) can never become or stop being part
 * of a pairing.
 */
const STRUCTURAL_CLASSES = [
  'kui-pane',
  'kui-pane__content',
  'kui-pane__header',
  'kui-pane__toolbar',
  'kui-pane__footer',
  'kui-nav-stack',
  'kui-nav-stack__viewport',
  'kui-nav-stack__view',
  'kui-nav-stack__chrome',
  'kui-nav-stack__bottom',
  'kui-tab-scaffold',
  'kui-tab-scaffold__scenes',
  'kui-tab-scaffold__scene',
  'kui-tab-scaffold__bar',
] as const;

const STRUCTURAL_SELECTOR = [
  ...STRUCTURAL_CLASSES.map((name) => `.${name}`),
  '[data-kui-tab-list]',
].join(', ');

/** Whether a class attribute value names a structural class. */
const hasStructuralClass = (value: string | null) =>
  !!value &&
  value
    .split(/\s+/)
    .some((token) => (STRUCTURAL_CLASSES as readonly string[]).includes(token));

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
  /** Each overlay Pane header, with its Pane. */
  let overlays = new Map<HTMLElement, HTMLElement>();
  /** Each overlay header's last measured border-box block size, in px. */
  const headerSizes = new Map<HTMLElement, number>();
  /** Each overlay header's Pane content scrollbar inline size, in px. */
  const scrollbarSizes = new Map<HTMLElement, number>();
  /** Each Pane this wiring has published a header clearance on. */
  const published = new Set<HTMLElement>();

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

  const collectOverlays = () => {
    const found = new Map<HTMLElement, HTMLElement>();
    for (const { root } of registrations)
      for (const pane of within<HTMLElement>(root, OVERLAY_PANE)) {
        const header = directChild(pane, PANE_CHROME.t);
        if (header) found.set(header, pane);
      }
    return found;
  };

  /**
   * Re-read the classic vertical scrollbar of each overlay Pane's content (its
   * `offsetWidth` beyond `clientWidth` and the borders; 0 for an overlay
   * scrollbar). Returns whether any changed.
   */
  const measureScrollbars = () => {
    let changed = false;
    for (const [header, pane] of overlays) {
      const scroller = directChild(pane, '.kui-pane__content');
      let size = 0;
      if (scroller) {
        const style =
          scroller.ownerDocument.defaultView!.getComputedStyle(scroller);
        size = Math.max(
          0,
          scroller.offsetWidth -
            scroller.clientWidth -
            (Number.parseFloat(style.borderLeftWidth) || 0) -
            (Number.parseFloat(style.borderRightWidth) || 0),
        );
      }
      if (scrollbarSizes.get(header) === size) continue;
      scrollbarSizes.set(header, size);
      changed = true;
    }
    return changed;
  };

  /**
   * Watches only the Panes this wiring published on, so a re-render that
   * strips the published clearance or gate gets them back before paint.
   */
  const overlayObserver = view?.MutationObserver
    ? new view.MutationObserver(() => {
        if (!disposed) publish();
      })
    : undefined;

  /**
   * Publish each measured overlay header's clearance on its Pane, with the
   * inline size of a classic scrollbar the header must leave uncovered.
   */
  const publish = () => {
    const current = new Map<HTMLElement, [string, string]>();
    for (const [header, pane] of overlays) {
      const size = headerSizes.get(header);
      const scrollbar = scrollbarSizes.get(header);
      if (size !== undefined)
        current.set(pane, [`${size}px`, scrollbar ? `${scrollbar}px` : '']);
    }
    // Disconnect first, so this wiring's own writes are not reported back.
    overlayObserver?.disconnect();
    for (const pane of published)
      if (!current.has(pane)) {
        pane.style.removeProperty(CLEARANCE_BLOCK_START);
        pane.style.removeProperty(SCROLLBAR_INLINE_SIZE);
        if (!pane.getAttribute('style')) pane.removeAttribute('style');
        pane.removeAttribute(HEADER_OVERLAY);
      }
    published.clear();
    for (const [pane, [value, scrollbar]] of current) {
      if (pane.style.getPropertyValue(CLEARANCE_BLOCK_START) !== value)
        pane.style.setProperty(CLEARANCE_BLOCK_START, value);
      if (pane.style.getPropertyValue(SCROLLBAR_INLINE_SIZE) !== scrollbar) {
        if (scrollbar) pane.style.setProperty(SCROLLBAR_INLINE_SIZE, scrollbar);
        else pane.style.removeProperty(SCROLLBAR_INLINE_SIZE);
      }
      if (pane.getAttribute(HEADER_OVERLAY) !== 'measured')
        pane.setAttribute(HEADER_OVERLAY, 'measured');
      published.add(pane);
      overlayObserver?.observe(pane, {
        attributes: true,
        attributeFilter: ['style', HEADER_OVERLAY],
      });
    }
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
  /**
   * A post-layout hook for the content re-measure: an inert zero-height box
   * outside the app tree whose width a content mutation toggles. The
   * ResizeObserver reports it after the frame's layout, so the re-measure
   * reads scroll extents from a clean layout instead of forcing one on the
   * freshly rendered tree.
   */
  let probe: HTMLElement | undefined;
  /** Whether a toggled probe has yet to be reported. */
  let probePending = false;
  const resizeObserver = view?.ResizeObserver
    ? new view.ResizeObserver((entries) => {
        if (disposed) return;
        const scrollers = new Set(pairings.map(({ scroller }) => scroller));
        let headerResized = false;
        // A scroller resized (a classic scrollbar appeared or went away) or
        // the post-layout probe reported: the scrollbars may have changed.
        let scrollersResized = false;
        for (const entry of entries) {
          const { target } = entry;
          if (overlays.has(target as HTMLElement)) {
            headerSizes.set(
              target as HTMLElement,
              entry.borderBoxSize?.[0]?.blockSize ??
                target.getBoundingClientRect().height,
            );
            headerResized = true;
            continue;
          }
          scrollersResized = true;
          if (target === probe) {
            probePending = false;
            for (const scroller of overflow.keys())
              overflow.set(scroller, measure(scroller));
            continue;
          }
          const scroller = scrollers.has(target as HTMLElement)
            ? (target as HTMLElement)
            : target.parentElement;
          if (scroller && scrollers.has(scroller))
            overflow.set(scroller, measure(scroller));
        }
        if (scrollersResized && measureScrollbars()) headerResized = true;
        apply();
        if (headerResized) publish();
      })
    : undefined;

  const observeSizes = () => {
    if (!resizeObserver) return;
    const wanted = new Set<Element>();
    for (const { scroller } of pairings) {
      wanted.add(scroller);
      for (const child of scroller.children) wanted.add(child);
    }
    for (const header of overlays.keys()) wanted.add(header);
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

  /**
   * Re-read every pairing. A registration measures at once; a mutation
   * (`afterLayout`) keeps each still-paired scroller's last measurement and
   * re-measures through the probe once the frame has laid out, before it
   * paints, so a structural re-render does not force a layout either.
   */
  const refresh = (afterLayout = false) => {
    const deferred = afterLayout && resizeObserver !== undefined;
    const previous = deferred ? new Map(overflow) : undefined;
    pairings = collect();
    overflow.clear();
    for (const { scroller } of pairings)
      overflow.set(
        scroller,
        previous ? (previous.get(scroller) ?? '') : measure(scroller),
      );
    overlays = collectOverlays();
    for (const sizes of [headerSizes, scrollbarSizes])
      for (const header of sizes.keys())
        if (!overlays.has(header)) sizes.delete(header);
    // A new overlay header is measured at once unless the ResizeObserver
    // will report it after this frame's layout.
    if (!deferred)
      for (const header of overlays.keys())
        if (!headerSizes.has(header))
          headerSizes.set(header, header.getBoundingClientRect().height);
    if (!deferred) measureScrollbars();
    observeSizes();
    apply();
    publish();
    if (deferred) scheduleRemeasure();
  };

  /** Re-measure every scroller (pairings unchanged); write what changed. */
  const remeasure = () => {
    let changed = false;
    for (const scroller of overflow.keys()) {
      const edges = measure(scroller);
      if (edges === overflow.get(scroller)) continue;
      overflow.set(scroller, edges);
      changed = true;
    }
    if (changed) apply();
    if (measureScrollbars()) publish();
  };

  let remeasureFrame: number | undefined;
  const scheduleRemeasure = () => {
    if (resizeObserver) {
      // Toggle once per report: a second toggle before the frame would undo
      // the size change and the report with it.
      if (probePending) return;
      probePending = true;
      if (!probe) {
        probe = ownerDocument.createElement('div');
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText =
          'position:fixed;top:0;left:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;contain:strict';
        resizeObserver.observe(probe);
      }
      // Outside body, so an app that renders into body never removes it; an
      // app that removed it anyway gets it back.
      if (!probe.isConnected) ownerDocument.documentElement.append(probe);
      probe.style.width = probe.style.width === '1px' ? '0px' : '1px';
      return;
    }
    if (remeasureFrame !== undefined || !view?.requestAnimationFrame) return;
    // The final disposer cancels a pending frame.
    remeasureFrame = view.requestAnimationFrame(() => {
      remeasureFrame = undefined;
      remeasure();
    });
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
        // Structure changes re-read every pairing. A re-render that only
        // dropped or changed attributes this wiring owns gets them back
        // without re-measuring.
        // Everything else (a row's selection class, a list morph's rows)
        // cannot change a pairing. It is re-measured after the next frame's
        // layout instead (through the probe, else in the next animation
        // frame), which catches what the scrollers' own observations cannot:
        // an extent change that resizes no direct child (an absolutely
        // positioned popup, a `display: contents` child), without forcing a
        // layout of the freshly rendered tree.
        const ids = targetIds();
        const selector = [
          STRUCTURAL_SELECTOR,
          ...[...ids].map((id) => `[id=${quoted(id)}]`),
        ].join(', ');
        if (records.some((record) => changesPairings(record, ids, selector)))
          refresh(true);
        else {
          if (
            records.some(
              ({ attributeName }) =>
                attributeName === SCROLL_OVERFLOW ||
                attributeName === SCROLL_DIVIDER,
            )
          )
            apply();
          if (
            records.some(
              ({ attributeName }) =>
                attributeName !== SCROLL_OVERFLOW &&
                attributeName !== SCROLL_DIVIDER,
            )
          )
            scheduleRemeasure();
        }
      })
    : undefined;

  /** Every target id any registration resolves. */
  const targetIds = () => {
    const ids = new Set<string>();
    for (const { targets } of registrations)
      for (const target of targets) {
        ids.add(target.scroller);
        for (const edge of EDGES) {
          const id = target[TARGET_EDGES[edge]];
          if (id) ids.add(id);
        }
      }
    return ids;
  };

  /** Whether `node` is or contains an element matching `selector`. */
  const holds = (node: Node, selector: string) =>
    node.nodeType === 1 &&
    ((node as Element).matches(selector) ||
      !!(node as Element).querySelector(selector));

  /**
   * Whether a mutation record can change what `collect()` finds: a structural
   * element or target-id element (or, through its old class or id, a former
   * one) changed, or one was added or removed. Every scroller is itself
   * structural or a target id, so a child-list change of a scroller (whose
   * child count `regionScrollers` reads, and whose children the
   * ResizeObserver watches) always counts.
   */
  const changesPairings = (
    {
      type,
      target,
      attributeName,
      oldValue,
      addedNodes,
      removedNodes,
    }: MutationRecord,
    ids: ReadonlySet<string>,
    selector: string,
  ) => {
    if (
      type === 'attributes' &&
      (attributeName === SCROLL_OVERFLOW || attributeName === SCROLL_DIVIDER)
    )
      return false;
    if (target.nodeType === 1 && (target as Element).matches(selector))
      return true;
    if (type === 'attributes')
      return attributeName === 'class'
        ? hasStructuralClass(oldValue)
        : attributeName === 'id' && oldValue !== null && ids.has(oldValue);
    for (const node of [...addedNodes, ...removedNodes])
      if (holds(node, selector)) return true;
    return false;
  };

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
        // Old values tell a class or id that stopped being structural.
        attributeOldValue: true,
        // The shown NavStack view and TabNavigator scene change by attribute,
        // and a Pane's header presentation by its attributes.
        attributeFilter: [
          'data-header-presentation',
          'data-chrome-placement',
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
        if (remeasureFrame !== undefined)
          view?.cancelAnimationFrame(remeasureFrame);
        remeasureFrame = undefined;
        resizeObserver?.disconnect();
        probe?.remove();
        probe = undefined;
        probePending = false;
        for (const [element, values] of written)
          for (const name of values.keys()) write(element, name, '');
        written.clear();
        overlays.clear();
        headerSizes.clear();
        scrollbarSizes.clear();
        publish();
        overlayObserver?.disconnect();
        overflow.clear();
        observed.clear();
        pairings = [];
        CONTROLLERS.delete(ownerDocument);
      }
    };
  };
}

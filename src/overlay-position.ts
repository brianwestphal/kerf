/**
 * Anchored positioning primitives for `kerfjs/overlay` — position an element
 * relative to an anchor, with viewport flip + clamp. These are standalone: they
 * take any element and have no overlay lifecycle, so `popover()` / `tooltip()`
 * build on them but you can also position your own element (an inline hint, a
 * custom menu). Re-exported from `src/overlay.ts` so the public `kerfjs/overlay`
 * surface is unchanged (KF-511 split out of overlay.ts's dialog + toast code).
 */

/** Vertical placement relative to an anchor (used by `popover`, {@link positionAnchored}, `tooltip`). */
export type PopoverPlacement = 'bottom' | 'top';

/** Placement options for {@link positionAnchored} / {@link autoReposition}. */
export interface AnchorPositionOptions {
  /** Preferred side of the anchor; flips to the other side if it would overflow the viewport. Default `'bottom'`. */
  placement?: PopoverPlacement;
  /** Horizontal edge to line up with the anchor: `'start'` (left edges) or `'end'` (right edges). Default `'start'`. */
  align?: 'start' | 'end';
  /** Gap in px between the anchor and the element. Default `4`. */
  gap?: number;
  /**
   * Gutter in px kept between the element and the viewport edges: the
   * horizontal clamp stops this far inside the left and right edges, and a
   * side fits only when the element ends this far inside the top or bottom
   * edge. Default `0` (the bare viewport edge).
   */
  viewportMargin?: number;
  /**
   * The element's height can shrink (it scrolls its overflow). When neither
   * side has room for its full height, it takes the side with more room, and
   * that room — from the gap to the viewport margin, in `el`'s CSS px — is
   * published on `el` as the `--kerf-anchor-available-height` custom property
   * on every reposition. Cap the element with it, for example
   * `max-height: var(--kerf-anchor-available-height); overflow: auto`. The
   * height measured for that choice honors the element's own `max-height`
   * (read without the published property, so `max-height: min(300px,
   * var(--kerf-anchor-available-height))` counts as a 300px cap), so an
   * app-capped element that fits the preferred side stays there. A relative
   * cap (`60%`, `calc()`, `min()`, `clamp()`) is resolved against the
   * element's fixed-position containing block (normally the viewport), and a
   * `max-height` transition on the element neither skews that read nor runs
   * because of it. While an animation or transition is already driving
   * `max-height` (an expand-from-0 entrance, a `@keyframes` animation), the
   * cap is the value it is headed to, and it is left running. An above
   * placement is pinned by its bottom edge (`bottom`, with `top: auto`), so
   * the element grows and shrinks upward, away from the anchor, as its height
   * changes between repositions; a below placement sets `top` with
   * `bottom: auto`. Default `false`.
   */
  fitHeight?: boolean;
}

/** The custom property `fitHeight` publishes on the positioned element. */
const AVAILABLE_HEIGHT = '--kerf-anchor-available-height';

/**
 * One-shot: position `el` relative to `anchor` — below by default, flipping above
 * if it would overflow the viewport, aligned to a horizontal edge and clamped into
 * view. Sets `el.style` `position: fixed`, `margin: 0`, `left`, and `top` (fixed so
 * `left`/`top` are viewport coordinates, matching `getBoundingClientRect`). When an
 * ancestor makes itself the containing block for fixed descendants (a
 * `transform`, `filter`, `perspective`, or `contain` on a wrapping `<dialog>`),
 * `left`/`top` are translated (and unscaled) into that box's coordinates so `el`
 * still lands next to the anchor. `viewportMargin` keeps a gutter from the
 * viewport edges; `fitHeight` publishes the room on the chosen side so CSS can
 * cap a scrolling element to it, and pins an above placement by `bottom`
 * (with `top: auto`) so the element grows upward from the anchor. This is
 * `popover()`'s placement core, usable on any element (an inline hint, a tooltip) —
 * no overlay lifecycle. Pair with {@link autoReposition} to keep it glued while open.
 */
export function positionAnchored(
  el: HTMLElement,
  anchor: Element,
  options: AnchorPositionOptions = {},
): void {
  const {
    placement = 'bottom',
    align = 'start',
    gap = 4,
    viewportMargin = 0,
    fitHeight = false,
  } = options;
  // Fix `el` FIRST, then measure it. Measuring a still-`display:block` wrapper
  // reports the full body-content width (≈ viewport minus body margins), which
  // collapses the horizontal clamp below and lands the element at the body's left
  // edge. As a fixed, shrink-to-fit box its `width`/`height` are its real size.
  el.style.position = 'fixed';
  el.style.margin = '0';
  const anchorRect = anchor.getBoundingClientRect();
  const elementRect = el.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Vertical: preferred side, flipped only if it overflows and the other side
  // fits. A height-flexible element that fits neither side takes the roomier one.
  const height = fitHeight ? fullHeight(el, elementRect) : elementRect.height;
  const belowTop = anchorRect.bottom + gap;
  const roomBelow = viewportHeight - viewportMargin - belowTop;
  const roomAbove = anchorRect.top - gap - viewportMargin;
  let below = placement !== 'top';
  if (height > roomBelow && height > roomAbove) {
    if (fitHeight) below = roomBelow >= roomAbove;
  } else if (below && height > roomBelow) below = false;
  else if (!below && height > roomAbove) below = true;

  // Horizontal: align to an anchor edge, then clamp inside the viewport gutter.
  let left =
    align === 'end' ? anchorRect.right - elementRect.width : anchorRect.left;
  left = Math.max(
    viewportMargin,
    Math.min(left, viewportWidth - viewportMargin - elementRect.width),
  );

  // `left`/`top` so far are viewport coordinates. They are only the CSS values
  // too when `el`'s fixed-position containing block is the viewport; an
  // ancestor with a `transform`, `filter`, `perspective`, `contain`, … (say a
  // modal `<dialog>` holding an overlay host slot) captures fixed descendants,
  // so map the coordinates into that box's space.
  const [originX, originY, scaleX, scaleY] = fixedOrigin(el);
  el.style.left = `${(left - originX) / scaleX}px`;
  if (fitHeight) {
    const room = Math.max(0, below ? roomBelow : roomAbove);
    el.style.setProperty(AVAILABLE_HEIGHT, `${room / scaleY}px`);
    if (!below) {
      // Above, a height-flexible element hangs from its bottom edge. Pin
      // `bottom` instead of deriving `top` from a height measured now, so
      // whatever height it goes on to lay out (the cap from the room just
      // published, a `max-height` expand still running, content that grows)
      // grows and shrinks upward, away from the anchor, never over it.
      const edge = anchorRect.top - gap;
      el.style.top = 'auto';
      el.style.bottom = `${(fixedBottom(el, originY, scaleY) - edge) / scaleY}px`;
      return;
    }
    el.style.bottom = 'auto';
  }
  const top = below ? belowTop : anchorRect.top - gap - height;
  el.style.top = `${(top - originY) / scaleY}px`;
}

/**
 * The height `el` would take without the cap a previous reposition published:
 * its laid-out height plus whatever it currently scrolls, but no more than its
 * own `max-height` (see {@link ownMaxHeight}). Read from scroll metrics rather
 * than by lifting the cap, which would reset the element's own scroll position
 * — and every scroll inside it repositions it. Scroll metrics and `max-height`
 * are CSS px, so they are scaled into the viewport px of `rect`.
 */
function fullHeight(el: HTMLElement, rect: DOMRect): number {
  const scale = el.offsetHeight ? rect.height / el.offsetHeight : 1;
  const full =
    rect.height + Math.max(0, el.scrollHeight - el.clientHeight) * scale;
  return Math.min(full, ownMaxHeight(el) * scale);
}

/** The vertical padding and border a `content-box` `max-height` excludes. */
const VERTICAL_EDGES = [
  'paddingTop',
  'paddingBottom',
  'borderTopWidth',
  'borderBottomWidth',
] as const;

/**
 * The stand-in room published while {@link ownMaxHeight} reads the element's
 * own cap: large enough that it never binds, and a valid length so a cap such
 * as `min(300px, var(--kerf-anchor-available-height))` still resolves (removing
 * the property would make that declaration invalid, so `none`).
 */
const UNBOUNDED_ROOM = '9999999px';

/**
 * The inline properties {@link ownMaxHeight} overrides around its read, in
 * restore order: the published room, then the transition longhands.
 */
const SWAPPED = [
  AVAILABLE_HEIGHT,
  'transition-property',
  'transition-duration',
  'transition-delay',
];

/**
 * `el`'s own border-box `max-height` in CSS px, excluding the room kerf
 * itself published. The published property is swapped for an unbounded room
 * only around a computed-style read (a style recalc, no layout, so nothing
 * reflows or scrolls) and restored at once, so kerf never reads its own last
 * cap back as the element's.
 *
 * A `max-height` transition would report its running value for that read (the
 * published room, not the cap) and start a transition on the swap, so for the
 * read `max-height` is appended to the element's transition list with no
 * duration or delay (the last entry for a property wins); every other running
 * transition keeps running. The restored cap is settled before the app's
 * transitions return, so they see no change to animate.
 *
 * While an animation or transition on `el` drives `max-height`, the cap is
 * the value it is headed to ({@link animatedMaxHeight}) and nothing is
 * swapped.
 *
 * A cap that stays relative after computing (a percentage, `calc()`,
 * `min()`, `clamp()`) is resolved against `el`'s containing block by
 * {@link resolveHeight}; a keyword (`none`, `fit-content`) is no cap.
 */
function ownMaxHeight(el: HTMLElement): number {
  const style = window.getComputedStyle(el);
  const maxHeight = animatedMaxHeight(el) ?? swappedMaxHeight(el, style);
  const inset =
    style.boxSizing === 'border-box'
      ? 0
      : VERTICAL_EDGES.reduce(
          (sum, edge) => sum + (Number.parseFloat(style[edge]) || 0),
          0,
        );
  if (maxHeight.endsWith('px')) return Number.parseFloat(maxHeight) + inset;
  // A keyword is no cap, and so is a keyframe `var()` that only `el` could
  // resolve (the probe does not inherit `el`'s custom properties).
  if (/^[a-z-]+$|var\(/.test(maxHeight)) return Infinity;
  return resolveHeight(el, maxHeight) + inset;
}

/**
 * `el`'s computed `max-height` with the published room swapped out, as
 * {@link ownMaxHeight} describes: the room and, when `el` has transitions,
 * the transition longhands are overridden for the read and restored exactly.
 */
function swappedMaxHeight(el: HTMLElement, style: CSSStyleDeclaration): string {
  const inline = el.style;
  const saved = SWAPPED.map((name): [string, string, string] => [
    name,
    inline.getPropertyValue(name),
    inline.getPropertyPriority(name),
  ]);
  // The computed transition lists, read before any of them is overridden.
  const lists = SWAPPED.map((name) => style.getPropertyValue(name).split(','));
  const transitions = lists[1]!;
  if (transitions[0] && transitions[0] !== 'none') {
    // Repeat the duration and delay lists to the property list's length, as
    // CSS does, so appending an entry leaves every existing pairing intact.
    for (let index = 1; index < 4; index++) {
      const items = lists[index]!;
      inline.setProperty(
        SWAPPED[index]!,
        [
          ...transitions.map((_, entry) => items[entry % items.length]),
          index > 1 ? '0s' : 'max-height',
        ].join(),
        'important',
      );
    }
  }
  inline.setProperty(AVAILABLE_HEIGHT, UNBOUNDED_ROOM);
  const maxHeight = style.maxHeight;
  saved.forEach(([name, value, priority], index) => {
    if (value) inline.setProperty(name, value, priority);
    else inline.removeProperty(name);
    // Settle the restored room before the transitions return.
    if (!index) style.getPropertyValue('max-height');
  });
  return maxHeight;
}

/**
 * The `max-height` an unfinished animation or transition on `el` is headed
 * to, or `undefined` when none drives it. While one runs (or is paused), the
 * computed value is its current frame — part-way through an app's expand
 * transition, or a `@keyframes` value — not the cap the element settles at,
 * and lifting the published room could retarget or cancel the app's
 * transition. So the cap is read from the effect instead: its last
 * `max-height` keyframe, or its first while the current iteration plays in
 * reverse. The topmost such effect in composite order wins; a finished one
 * that still fills already shows its final value in computed style.
 */
function animatedMaxHeight(el: HTMLElement): string | undefined {
  // An engine (or DOM shim) without Web Animations has nothing animating.
  const animations = el.getAnimations?.() ?? [];
  for (let index = animations.length - 1; index >= 0; index--) {
    const animation = animations[index]!;
    const effect = animation.effect as KeyframeEffect | null;
    const frames = (effect?.getKeyframes() ?? []).filter(
      (frame) => frame['maxHeight'] != null,
    );
    if (!frames.length) continue;
    if (animation.playState === 'finished') return undefined;
    const { direction, currentIteration } = effect!.getComputedTiming();
    const odd = (currentIteration ?? 0) % 2 === 1;
    const reversed =
      (direction === 'reverse' ||
        (direction === 'alternate' && odd) ||
        (direction === 'alternate-reverse' && !odd)) !==
      animation.playbackRate < 0;
    return String(frames[reversed ? 0 : frames.length - 1]!['maxHeight']);
  }
  return undefined;
}

/**
 * Resolve a computed but still relative height (`60%`, `calc(50% - 1rem)`,
 * `min(300px, 60%)`) to CSS px against `el`'s fixed-position containing block
 * — the viewport, or a transformed ancestor: a fixed probe beside `el` takes it
 * as its `height`, and the probe's used height is read back. `el` itself is
 * never touched, so its scroll position and layout are unaffected. A height
 * the probe cannot take, or a detached `el`, is no cap.
 */
function resolveHeight(el: HTMLElement, height: string): number {
  return withFixedProbe(
    el,
    'width:0;box-sizing:content-box;min-height:0;max-height:none;visibility:hidden',
    (probe) => {
      probe.style.height = height;
      if (!probe.style.height) return Infinity;
      return Number.parseFloat(window.getComputedStyle(probe).height);
    },
    Infinity,
  );
}

/**
 * Run `measure` on a fixed-position probe at `left: 0; top: 0`, inserted just
 * before `el` so it shares `el`'s containing block, then remove it. The probe
 * is inserted and removed synchronously, so it is never painted. A detached
 * `el` has no containing block to share, so `detached` is returned instead.
 */
function withFixedProbe<T>(
  el: HTMLElement,
  css: string,
  measure: (probe: HTMLElement) => T,
  detached: T,
): T {
  const parent = el.parentNode;
  if (!parent) return detached;
  const probe = el.ownerDocument.createElement('div');
  probe.style.cssText = `position:fixed;left:0;top:0;display:block;margin:0;padding:0;border:0;${css}`;
  parent.insertBefore(probe, el);
  const result = measure(probe);
  probe.remove();
  return result;
}

/**
 * Where `left: 0; top: 0` actually lands for a fixed-position child of `el`'s
 * parent, plus that containing block's scale — `[x, y, scaleX, scaleY]`, which
 * is `[0, 0, 1, 1]` when the viewport is the containing block. Measured with a
 * 1px probe rather than `el` itself so `el`'s own transform or running entrance
 * animation cannot skew it. Translation and scale are compensated; a rotated
 * or skewed containing block is not.
 */
function fixedOrigin(el: HTMLElement): [number, number, number, number] {
  return withFixedProbe(
    el,
    'width:1px;height:1px',
    (probe): [number, number, number, number] => {
      const rect = probe.getBoundingClientRect();
      // A zero size (a containing block mid `scale(0)` animation, or a DOM
      // without layout) would divide by zero; treat it as unscaled.
      return [rect.left, rect.top, rect.width || 1, rect.height || 1];
    },
    [0, 0, 1, 1],
  );
}

/**
 * The viewport y of the bottom edge of `el`'s fixed-position containing block
 * (where `bottom: 0` lands), measured with a 1px probe pinned there. A
 * detached `el`, or a containing block with no layout (a DOM without layout,
 * a `scale(0)` animation), falls back to the viewport height below the origin
 * {@link fixedOrigin} measured, at its scale.
 */
function fixedBottom(el: HTMLElement, originY: number, scaleY: number): number {
  const fallback = originY + window.innerHeight * scaleY;
  return withFixedProbe(
    el,
    'width:1px;height:1px;top:auto;bottom:0',
    (probe) => {
      const rect = probe.getBoundingClientRect();
      return rect.height ? rect.bottom : fallback;
    },
    fallback,
  );
}

/**
 * Keep `el` positioned against `anchor` (via {@link positionAnchored}) as the page
 * scrolls or resizes. Positions once immediately, then re-runs on `scroll`
 * (capture phase — catches scrolls in any inner container, not just `window`) and
 * `resize`. Returns a disposer that removes the listeners.
 */
export function autoReposition(
  el: HTMLElement,
  anchor: Element,
  options: AnchorPositionOptions = {},
): () => void {
  const reposition = (): void => positionAnchored(el, anchor, options);
  reposition();
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  return () => {
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  };
}

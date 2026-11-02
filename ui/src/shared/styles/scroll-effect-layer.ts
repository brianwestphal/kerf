/**
 * The markup side of the shared scroll-effect layer (KF-YCX1XH, the CSS-only
 * scroll-effect layer extracted from BackdropImage). Its stylesheet is
 * `components/surfaces/scroll-effect/scroll-effect.css`: an element carrying
 * `data-kui-scroll-timeline` is a named view-timeline subject, and an element
 * carrying `data-kui-scroll-effect` animates one compositor-only keyframe
 * family (`transform` or `opacity`) over a range of the nearest subject's
 * timeline. The stylesheet owns the static fallbacks, so every effect built
 * on it is static without scroll-driven animation support, under reduced
 * motion, under `data-kui-effects="static"`, on slow-update displays, and
 * under reduced transparency or increased contrast.
 *
 * A component marks only elements it renders itself. Inputs travel as inline
 * custom properties, so no component stylesheet writes another's variables.
 */

/** The compositor-only keyframe family a layer animates. */
export type ScrollEffectFamily = 'translate' | 'scale' | 'opacity';

/** A numeric keyframe endpoint, or a component's own private variable. */
export type ScrollEffectValue = number | `var(--_kui-${string})`;

/** One animated layer of the shared scroll-effect layer. */
export interface ScrollEffectLayer {
  family: ScrollEffectFamily;
  /**
   * The start value: a translateY in multiples of the layer's own height, a
   * scale factor, or an opacity. Omitted, the stylesheet's default is 0.
   */
  from?: ScrollEffectValue;
  /** The end value, in the same unit. Omitted, the default is 1. */
  to?: ScrollEffectValue;
  /**
   * The CSS `animation-range` over the subject's view timeline, such as
   * `exit-crossing 0% exit-crossing 50%`.
   */
  range: string;
}

/** Marks the view-timeline subject whose scroll drives nested layers. */
export const SCROLL_TIMELINE_ATTRIBUTE = 'data-kui-scroll-timeline';

const RANGE = /^[a-z-]+ (?:\d+(?:\.\d+)?)% [a-z-]+ (?:\d+(?:\.\d+)?)%$/;

function value(input: ScrollEffectValue): string {
  return typeof input === 'number' ? String(input) : input;
}

/** The inline custom properties that configure one layer. */
export function scrollEffectLayerStyle(layer: ScrollEffectLayer): string {
  if (!RANGE.test(layer.range))
    throw new TypeError(
      `Scroll effect range must be "<name> <start>% <name> <end>%", received "${layer.range}".`,
    );
  return [
    layer.from === undefined
      ? ''
      : `--_kui-scroll-effect-from:${value(layer.from)}`,
    layer.to === undefined ? '' : `--_kui-scroll-effect-to:${value(layer.to)}`,
    `--_kui-scroll-effect-range:${layer.range}`,
  ]
    .filter(Boolean)
    .join(';');
}

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import {
  SCROLL_TIMELINE_ATTRIBUTE,
  type ScrollEffectLayer,
  scrollEffectLayerStyle,
} from '../../../shared/styles/scroll-effect-layer.js';

/**
 * The part of the wrapper's view timeline an effect runs over, as the CSS
 * named timeline ranges: `entry` while it scrolls into view, `exit` while it
 * scrolls out, `cover` from first to last visible pixel, and `contain` while
 * it is fully in view (or fully covers the view).
 */
export type ScrollEffectRange = 'entry' | 'exit' | 'cover' | 'contain';

/** Where an effect runs, shared by every preset. */
export interface ScrollEffectRangeOptions {
  /** The timeline range. Each preset has its own default. */
  range?: ScrollEffectRange;
  /** Where the effect starts within `range`, from 0 to 100 percent. Default 0. */
  rangeStart?: number;
  /** Where the effect ends within `range`, from 0 to 100 percent. Default 100. */
  rangeEnd?: number;
}

/**
 * The content lags the scroll by `lag` (0 to 1; `subtle` is 0.35), the way
 * BackdropImage's parallax does. Over `exit` (the default) it moves by the lag
 * times its own height, which is exactly the lag factor of the scroll there;
 * over `entry` it settles into place, and over `cover` or `contain` it passes
 * its resting place halfway. The wrapper clips the moving content.
 */
export interface ScrollEffectParallax extends ScrollEffectRangeOptions {
  kind: 'parallax';
  lag?: number | 'subtle';
}

/** The content fades in from transparent. Default range `entry`. */
export interface ScrollEffectReveal extends ScrollEffectRangeOptions {
  kind: 'reveal';
}

/** The content fades out to transparent. Default range `exit`. */
export interface ScrollEffectFade extends ScrollEffectRangeOptions {
  kind: 'fade';
}

/**
 * The content scales from `from` to `to` (each above 0, at most 2; defaults
 * 0.96 and 1) around its center. Default range `entry`. The wrapper clips a
 * scale above 1.
 */
export interface ScrollEffectScale extends ScrollEffectRangeOptions {
  kind: 'scale';
  from?: number;
  to?: number;
}

/**
 * A black layer over the content ramps to opacity `to` (0 to 1; default
 * 0.5). Default range `exit`.
 */
export interface ScrollEffectDim extends ScrollEffectRangeOptions {
  kind: 'dim';
  to?: number;
}

/** One scroll-linked effect preset. */
export type ScrollEffectSpec =
  | ScrollEffectParallax
  | ScrollEffectReveal
  | ScrollEffectFade
  | ScrollEffectScale
  | ScrollEffectDim;

export type ScrollEffectKind = ScrollEffectSpec['kind'];

export interface ScrollEffectProps {
  /**
   * The effects. They compose: transforms stack in array order (the first is
   * outermost) and opacities multiply, so `reveal` on `entry` with `fade` on
   * `exit` fades content in and out. Repeating a kind stacks it the same way
   * (each `dim` adds its own overlay).
   */
  effects: readonly ScrollEffectSpec[];
  /** The content the effects apply to. */
  children?: KerfUiContent;
  /** Application `data-*` metadata on the root, such as an editor node
   * marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const SCROLL_EFFECT_PROTECTED = new Set([
  'data-component',
  'data-clip',
  SCROLL_TIMELINE_ATTRIBUTE,
]);

const SUBTLE_LAG = 0.35;
const RANGES: ReadonlySet<string> = new Set([
  'entry',
  'exit',
  'cover',
  'contain',
]);
const DEFAULT_RANGE: Record<ScrollEffectKind, ScrollEffectRange> = {
  parallax: 'exit',
  reveal: 'entry',
  fade: 'exit',
  scale: 'entry',
  dim: 'exit',
};

function inRange(
  value: number,
  min: number,
  max: number,
  message: string,
): number {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new RangeError(`ScrollEffect ${message}`);
  return value;
}

function positiveScale(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0 || value > 2)
    throw new RangeError(
      `ScrollEffect scale.${name} must be above 0 and at most 2.`,
    );
  return value;
}

function animationRange(effect: ScrollEffectSpec): {
  name: ScrollEffectRange;
  css: string;
} {
  const name = effect.range ?? DEFAULT_RANGE[effect.kind];
  if (!RANGES.has(name))
    throw new TypeError(
      `ScrollEffect ${effect.kind}.range must be entry, exit, cover, or contain.`,
    );
  const start = inRange(
    effect.rangeStart ?? 0,
    0,
    100,
    `${effect.kind}.rangeStart must be from 0 to 100.`,
  );
  const end = inRange(
    effect.rangeEnd ?? 100,
    0,
    100,
    `${effect.kind}.rangeEnd must be from 0 to 100.`,
  );
  if (start >= end)
    throw new RangeError(
      `ScrollEffect ${effect.kind}.rangeStart must be below rangeEnd.`,
    );
  return {
    name,
    css: `${name} ${String(start)}% ${name} ${String(end)}%`,
  };
}

/** The shared-layer configuration for one validated effect. */
function scrollEffectLayer(effect: ScrollEffectSpec): ScrollEffectLayer {
  if (!Object.hasOwn(DEFAULT_RANGE, effect.kind))
    throw new TypeError(
      'ScrollEffect effect kind must be parallax, reveal, fade, scale, or dim.',
    );
  const range = animationRange(effect);
  switch (effect.kind) {
    case 'parallax': {
      const lag =
        effect.lag === 'subtle' || effect.lag === undefined
          ? SUBTLE_LAG
          : inRange(
              effect.lag,
              0,
              1,
              'parallax.lag must be subtle or a number from 0 to 1.',
            );
      // The offset rises by the lag across the range, resting at 0 where the
      // content sits in place: the start of exit, the end of entry, and the
      // middle of cover or contain.
      const from =
        range.name === 'exit' ? 0 : range.name === 'entry' ? -lag : -lag / 2;
      return {
        family: 'translate',
        from,
        to: from + lag,
        range: range.css,
      };
    }
    case 'reveal':
      return { family: 'opacity', from: 0, to: 1, range: range.css };
    case 'fade':
      return { family: 'opacity', from: 1, to: 0, range: range.css };
    case 'scale':
      return {
        family: 'scale',
        from: positiveScale(effect.from ?? 0.96, 'from'),
        to: positiveScale(effect.to ?? 1, 'to'),
        range: range.css,
      };
    case 'dim':
      return {
        family: 'opacity',
        from: 0,
        to: inRange(effect.to ?? 0.5, 0, 1, 'dim.to must be from 0 to 1.'),
        range: range.css,
      };
  }
}

/**
 * Applies scroll-linked effects to any content without a scroll listener:
 * each effect animates only `transform` or `opacity` on the wrapper's own
 * CSS view timeline, which the compositor runs. Kerf owns the static
 * fallbacks: the content rests in place, fully visible and undimmed, without
 * scroll-driven animation support, under reduced motion, under
 * `data-kui-effects="static"`, on slow-update displays, and under reduced
 * transparency, increased contrast, or forced colors.
 */
export function ScrollEffect({
  effects,
  children,
  rootAttributes = {},
}: ScrollEffectProps) {
  const layers: ScrollEffectLayer[] = [];
  const dims: ScrollEffectLayer[] = [];
  let clip = false;
  for (const effect of effects) {
    const layer = scrollEffectLayer(effect);
    (effect.kind === 'dim' ? dims : layers).push(layer);
    if (
      effect.kind === 'parallax' ||
      (layer.family === 'scale' &&
        Math.max(Number(layer.from), Number(layer.to)) > 1)
    )
      clip = true;
  }
  const content = layers.reduceRight<KerfUiContent>(
    (inner, layer) => (
      <div
        class="kui-scroll-effect__layer"
        data-kui-scroll-effect={layer.family}
        style={scrollEffectLayerStyle(layer)}
      >
        {inner}
      </div>
    ),
    children,
  );
  return (
    <div
      {...filterDataAttributes(rootAttributes, SCROLL_EFFECT_PROTECTED)}
      class="kui-scroll-effect"
      data-component="scroll-effect"
      data-kui-scroll-timeline=""
      data-clip={clip ? 'true' : undefined}
    >
      {content}
      {dims.map((dim) => (
        <div
          class="kui-scroll-effect__dim"
          aria-hidden="true"
          data-kui-scroll-effect={dim.family}
          style={scrollEffectLayerStyle(dim)}
        />
      ))}
    </div>
  );
}

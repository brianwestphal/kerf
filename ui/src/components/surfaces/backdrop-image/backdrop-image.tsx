import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterRootAttributes,
  type StructuralRootAttributes,
} from '../../../shared/dom/extension-attributes.js';
import {
  type CssColor,
  type CssLength,
  remify,
} from '../../../shared/styles/css-values.js';

/** How a single image fills the backdrop (`object-fit`). */
export type BackdropImageFit = 'cover' | 'contain' | 'fill';

/** Which part of the image stays in view when it is cropped. */
export type BackdropImagePosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top left'
  | 'top right'
  | 'bottom left'
  | 'bottom right';

/** Tile the image as a background instead of fitting one copy. */
export type BackdropImageRepeat = 'repeat' | 'repeat-x' | 'repeat-y';

/**
 * How far the image lags the scroll: `none` scrolls with the content,
 * `subtle` lags by 35%, and a number from 0 to 1 is the lag factor (0.5
 * moves the image at half the scroll speed).
 */
export type BackdropImageParallax = 'none' | 'subtle' | number;

/**
 * A dimming layer under `overlay` content: `bottom` darkens toward the
 * block end where a title sits, `full` dims the whole image evenly.
 */
export type BackdropImageScrim = 'none' | 'bottom' | 'full';

/**
 * A scroll-linked progressive blur: a statically blurred copy of the image
 * fades in as the image block scrolls away. Only the copy's opacity (and the
 * optional dim layer's) animates; the blur itself is set once.
 */
export interface BackdropImageBlur {
  /**
   * CSS blur radius applied once to the copy. Default 24px; with
   * `blurredSrc` the default is no filter, since that asset is already soft.
   */
  radius?: CssLength;
  /**
   * An app-supplied pre-blurred or low-resolution copy of the image, used
   * instead of filtering `src`.
   */
  blurredSrc?: string;
  /**
   * Peak opacity, from 0 to 1, of a black dim layer that ramps in with the
   * blur. Default 0 (no dim layer).
   */
  dim?: number;
}

const backdropImageProtected = new Set([
  'data-component',
  'data-blur',
  'data-parallax',
  'data-scrim',
  'data-fade',
  'data-repeat',
  'data-under-chrome',
  'data-aspect-ratio',
  'data-inline-bleed',
  'data-defer-offscreen',
]);

type BackdropImageRootAttributes = StructuralRootAttributes &
  Readonly<{
    'data-component'?: never;
    'data-blur'?: never;
    'data-parallax'?: never;
    'data-scrim'?: never;
    'data-fade'?: never;
    'data-repeat'?: never;
    'data-under-chrome'?: never;
    'data-aspect-ratio'?: never;
    'data-inline-bleed'?: never;
    'data-defer-offscreen'?: never;
  }>;

interface BackdropImageCommonProps {
  /** Image URL. */
  src: string;
  /**
   * Accessible description of the image. Pass `''` for a decorative image
   * that only sets a mood; assistive technology then skips it.
   */
  alt: string;
  /** Which part of a cropped image stays in view. Default `center`. */
  position?: BackdropImagePosition;
  /** Height of the image block. Default 320px (`remify(320)`). */
  height?: CssLength;
  /** Reserve image height from its width, useful for an inline card. Cannot be combined with `height`. */
  aspectRatio?: number;
  /** Native image loading behavior. Omit for the browser default. */
  loading?: 'eager' | 'lazy';
  /** Bleed to a Pane's inline content edges. Set false when embedded in a card. Defaults to true. */
  bleedInline?: boolean;
  /** How far the image lags the scroll. Default `none`. */
  parallax?: BackdropImageParallax;
  /**
   * The color the image fades into at its block end. It also paints the
   * whole surface, so `children` below the image sit on the same color and
   * the page reads as one surface. Omit for a hard edge with no surface.
   */
  fadeTo?: CssColor;
  /**
   * Blur the image progressively as it scrolls away, by cross-fading a
   * statically blurred copy. Static (unblurred) wherever parallax is.
   */
  blur?: BackdropImageBlur;
  /** Skip painting the image hero while it is off screen in a long feed. */
  deferOffscreen?: boolean;
  /**
   * Run the image up beneath the scroller's block-start inset: an overlay or
   * clear Pane header, NavStack chrome handed to a view's Pane, and the top
   * safe area, the way a media page's artwork fills the screen behind
   * transparent chrome. The visible image keeps `height` below that inset,
   * and `overlay` content stays clear of the chrome. Place the image first in
   * the Pane's content; it reads the Pane's
   * `--kui-pane-content-inset-block-start`. Default `false`.
   */
  underChrome?: boolean;
  /** Dim the image under `overlay` content. Default `none`. */
  scrim?: BackdropImageScrim;
  /** Content laid over the image's block end, such as a title and actions. */
  overlay?: KerfUiContent;
  /** Content that continues below the image on the `fadeTo` surface. */
  children?: KerfUiContent;
  id?: string;
  className?: string;
  /** Safe `data-*`, `aria-*`, and structural `role` metadata on the root. */
  rootAttributes?: BackdropImageRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** One fitted image, with optional responsive candidates. */
export interface BackdropImageSingleProps extends BackdropImageCommonProps {
  repeat?: undefined;
  /** Responsive image candidates (`srcset`). */
  srcset?: string;
  /** Rendered-size hints for `srcset` (`sizes`). */
  sizes?: string;
  /** How the image fills the block. Default `cover`. */
  fit?: BackdropImageFit;
}

/** A tiled background image at its natural size. */
export interface BackdropImageTiledProps extends BackdropImageCommonProps {
  repeat: BackdropImageRepeat;
  srcset?: never;
  sizes?: never;
  fit?: never;
}

export type BackdropImageProps =
  BackdropImageSingleProps | BackdropImageTiledProps;

const SUBTLE_PARALLAX = 0.35;

function parallaxFactor(parallax: BackdropImageParallax): number {
  if (parallax === 'none') return 0;
  if (parallax === 'subtle') return SUBTLE_PARALLAX;
  if (!Number.isFinite(parallax) || parallax < 0 || parallax > 1)
    throw new RangeError(
      'BackdropImage parallax must be none, subtle, or a number from 0 to 1.',
    );
  return parallax;
}

function blurDim(dim: number | undefined): number {
  if (dim === undefined) return 0;
  if (!Number.isFinite(dim) || dim < 0 || dim > 1)
    throw new RangeError('BackdropImage blur.dim must be from 0 to 1.');
  return dim;
}

const unsafeStyleValue = /[;{}<>"'\\]|\p{Cc}/u;

function styleValue(value: string, prop: string): string {
  const trimmed = value.trim();
  if (!trimmed || unsafeStyleValue.test(trimmed))
    throw new TypeError(`BackdropImage ${prop} requires one CSS value.`);
  return trimmed;
}

/** A CSS `url("…")` for the tiled form; quotes and backslashes are escaped. */
function cssUrl(src: string): string {
  if (/\p{Cc}/u.test(src))
    throw new TypeError(
      'BackdropImage src must not contain control characters.',
    );
  return `url("${src.replace(/["\\]/g, (char) => `\\${char}`)}")`;
}

/**
 * An image backdrop at the top of a scrolling Pane or NavStack view: the
 * image can lag the scroll (parallax on a scroll-driven, compositor-only
 * transform), fade through a mask into `fadeTo`, and that color keeps
 * painting under `children` so the page reads as one surface. Kerf owns the
 * static fallbacks: no parallax without scroll-driven animation support,
 * under reduced motion, under `data-kui-effects="static"`, or on a
 * slow-update display, and a hard edge onto solid `fadeTo` under reduced
 * transparency.
 */
export function BackdropImage(props: BackdropImageProps) {
  const {
    src,
    alt,
    position = 'center',
    height,
    aspectRatio,
    loading,
    bleedInline = true,
    parallax = 'none',
    blur,
    deferOffscreen = false,
    fadeTo,
    scrim = 'none',
    underChrome = false,
    overlay,
    children,
    id,
    className = '',
    rootAttributes = {},
    slot,
  } = props;
  const factor = parallaxFactor(parallax);
  if (
    aspectRatio !== undefined &&
    (!Number.isFinite(aspectRatio) || aspectRatio <= 0)
  )
    throw new RangeError('BackdropImage aspectRatio must be positive.');
  if (aspectRatio !== undefined && height !== undefined)
    throw new TypeError(
      'BackdropImage height and aspectRatio cannot be combined.',
    );
  const dim = blurDim(blur?.dim);
  const blurRadius =
    blur === undefined
      ? undefined
      : (blur.radius ??
        (blur.blurredSrc === undefined ? remify(24) : undefined));
  const style = [
    height === undefined
      ? ''
      : `--_kui-backdrop-image-height:${styleValue(height, 'height')}`,
    aspectRatio === undefined
      ? ''
      : `--_kui-backdrop-image-ratio:${String(aspectRatio)}`,
    fadeTo === undefined
      ? ''
      : `--_kui-backdrop-image-fade-to:${styleValue(fadeTo, 'fadeTo')}`,
    factor === 0 ? '' : `--_kui-backdrop-image-parallax:${String(factor)}`,
    position === 'center' ? '' : `--_kui-backdrop-image-position:${position}`,
    props.fit === undefined || props.fit === 'cover'
      ? ''
      : `--_kui-backdrop-image-fit:${props.fit}`,
    blurRadius === undefined
      ? ''
      : `--_kui-backdrop-image-blur:${styleValue(blurRadius, 'blur.radius')}`,
    dim === 0 ? '' : `--_kui-backdrop-image-dim:${String(dim)}`,
  ]
    .filter(Boolean)
    .join(';');
  const image = (className: string, source: string, copy: boolean) =>
    props.repeat === undefined ? (
      <img
        class={className}
        src={source}
        srcSet={source === src ? props.srcset : undefined}
        sizes={source === src ? props.sizes : undefined}
        alt={copy ? '' : alt}
        aria-hidden={copy ? 'true' : undefined}
        decoding="async"
        loading={loading}
      />
    ) : (
      <div
        class={className}
        role={!copy && alt ? 'img' : undefined}
        aria-label={!copy && alt ? alt : undefined}
        aria-hidden={copy ? 'true' : undefined}
        style={`background-image:${cssUrl(source)};background-repeat:${props.repeat}`}
      />
    );
  const hasOverlay =
    overlay !== undefined && overlay !== null && overlay !== false;
  const hasChildren =
    children !== undefined && children !== null && children !== false;
  return (
    <div
      {...filterRootAttributes(rootAttributes, backdropImageProtected)}
      id={id}
      class={`kui-backdrop-image ${className}`.trim()}
      data-component="backdrop-image"
      data-parallax={factor === 0 ? 'none' : 'scroll'}
      data-blur={
        blur === undefined
          ? undefined
          : blurRadius === undefined
            ? 'asset'
            : 'filter'
      }
      data-fade={fadeTo === undefined ? undefined : 'true'}
      data-scrim={scrim === 'none' ? undefined : scrim}
      data-repeat={props.repeat}
      data-under-chrome={underChrome ? 'true' : undefined}
      data-aspect-ratio={aspectRatio === undefined ? undefined : 'true'}
      data-inline-bleed={bleedInline ? undefined : 'false'}
      data-defer-offscreen={deferOffscreen ? 'true' : undefined}
      style={style || undefined}
      slot={slot}
    >
      <div class="kui-backdrop-image__hero">
        <div class="kui-backdrop-image__backdrop">
          <div class="kui-backdrop-image__layers">
            {image('kui-backdrop-image__media', src, false)}
            {blur === undefined
              ? null
              : image(
                  'kui-backdrop-image__blurred',
                  blur.blurredSrc ?? src,
                  true,
                )}
          </div>
          {dim === 0 ? null : <div class="kui-backdrop-image__dim" />}
          {scrim === 'none' ? null : <div class="kui-backdrop-image__scrim" />}
        </div>
        {hasOverlay ? (
          <div class="kui-backdrop-image__overlay">{overlay}</div>
        ) : null}
      </div>
      {hasChildren ? (
        <div class="kui-backdrop-image__content">{children}</div>
      ) : null}
    </div>
  );
}

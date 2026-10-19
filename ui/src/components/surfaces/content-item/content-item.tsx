import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import type { CssColor } from '../../../shared/styles/css-values.js';
import type { SemanticTone } from '../../../shared/styles/semantic-tone.js';
import {
  type SurfaceTint,
  surfaceTintAttributes,
} from '../../../shared/styles/surface-tint.js';
import {
  BackdropImage,
  type BackdropImageBlur,
  type BackdropImageParallax,
  type BackdropImagePosition,
  type BackdropImageScrim,
} from '../backdrop-image/backdrop-image.js';

export type { SemanticTone } from '../../../shared/styles/semantic-tone.js';

/**
 * Base surface treatment, semantic status colors, or `brand-loud`: the solid
 * brand fill with its on-loud foreground (a transcript's own messages).
 */
export type ContentItemAppearance =
  'transparent' | 'surface' | 'brand-loud' | SemanticTone;

/**
 * A chat-bubble layout for transcripts: the item fits its content up to 80%
 * of the row and sits at the `start` (other participants) or `end` (the
 * person's own messages) of the line.
 */
export type ContentItemBubble = 'start' | 'end';

/** Whether the item's always-reserved 1px border is transparent or visible. */
export type ContentItemFrame = 'none' | 'framed';

/** Corner shape: the 12px rounded rectangle or the 22px pill. */
export type ContentItemShape = 'rounded' | 'pill';
/** `single` uses an option; `multiple` uses a grid row; `toggle` uses a pressed button. */
export type ContentItemSelectionMode =
  'none' | 'single' | 'multiple' | 'toggle';

/** One card-owned lead image in the containing feed's shared scrollport. */
export interface ContentItemMedia {
  src: string;
  alt: string;
  srcset?: string;
  sizes?: string;
  /** Width divided by height; reserves the image block before it loads. Default 16/9. */
  aspectRatio?: number;
  position?: BackdropImagePosition;
  /** Default subtle (35% lag); set none for a static lead image. */
  parallax?: BackdropImageParallax;
  /** App-supplied soft copy; its opacity changes, never its blur filter. */
  blurredSrc?: string;
  /** Shared BackdropImage blur behavior; use instead of `blurredSrc`. */
  blur?: BackdropImageBlur;
  /** Color the image dissolves into and the card body continues on. */
  fadeTo?: CssColor;
  /** Content layered over the image, including native controls. */
  overlay?: KerfUiContent;
  /** Dim the image behind overlay content. */
  scrim?: BackdropImageScrim;
  /** Extend the image to the card's top, left, and right inner edges. */
  edgeToEdge?: boolean;
}

function mediaParallax(value: BackdropImageParallax): number {
  if (value === 'none') return 0;
  if (value === 'subtle') return 0.35;
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new RangeError('ContentItem media.parallax must be from 0 to 1.');
  return value;
}

const mediaPositions = new Set<BackdropImagePosition>([
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'top left',
  'top right',
  'bottom left',
  'bottom right',
]);

function roleForSelectionMode(
  mode: ContentItemSelectionMode,
): 'option' | 'row' | 'button' {
  switch (mode) {
    case 'single':
      return 'option';
    case 'multiple':
      return 'row';
    case 'none':
    case 'toggle':
      return 'button';
  }
}

const contentItemProtectedAttributes = new Set([
  'data-component',
  'data-appearance',
  'data-outlined',
  'data-bubble',
  'data-grid-row',
  'data-media-state',
  'data-media-edge',
  'data-media-fade',
  'data-kui-tint',
  'data-kui-tint-accent',
]);
const interactiveProtectedAttributes = new Set([
  'data-component',
  'data-appearance',
  'data-outlined',
  'data-bubble',
  'data-grid-row',
  'data-media-state',
  'data-media-edge',
  'data-media-fade',
  'data-kui-tint',
  'data-kui-tint-accent',
  'data-action',
  'data-item-id',
  'data-interactive',
  'data-selected',
  'data-disabled',
  'data-selection-mode',
  'data-kui-pressed',
]);

type ContentItemRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-appearance'?: never;
    'data-outlined'?: never;
    'data-bubble'?: never;
    'data-grid-row'?: never;
    'data-media-state'?: never;
    'data-media-edge'?: never;
    'data-media-fade'?: never;
    'data-kui-tint'?: never;
    'data-kui-tint-accent'?: never;
  }
>;

type ContentItemInteractiveRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-appearance'?: never;
    'data-outlined'?: never;
    'data-bubble'?: never;
    'data-grid-row'?: never;
    'data-media-state'?: never;
    'data-media-edge'?: never;
    'data-media-fade'?: never;
    'data-kui-tint'?: never;
    'data-kui-tint-accent'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-interactive'?: never;
    'data-selected'?: never;
    'data-disabled'?: never;
    'data-selection-mode'?: never;
    'data-kui-pressed'?: never;
  }
>;

interface ContentItemBaseProps {
  /**
   * Coordinated background, border, and foreground colors. `transparent`
   * preserves the surrounding surface; `surface` paints the base surface;
   * semantic values match StateBanner. Defaults to `transparent`.
   */
  appearance?: ContentItemAppearance;
  /** Reserved lead image with a per-image scroll timeline. Wire the containing root with `wireContentItems`. */
  media?: ContentItemMedia;
  /** App-sampled image color, scoped to this card once its image loads. */
  tint?: SurfaceTint;
  /** Item content; a plain string is allowed for bare copy. */
  children?: KerfUiContent | string;
  /**
   * `framed` paints the standard neutral border in the 1px the item always
   * reserves, so framing never changes geometry. Frame only an item that
   * marks a real distinction. Defaults to `none` (transparent border).
   */
  frame?: ContentItemFrame;
  /** Remove block padding and block borders while retaining inline geometry. */
  flush?: boolean;
  /** Corner shape. Defaults to `rounded`. */
  shape?: ContentItemShape;
  /**
   * Lay the item out as a chat bubble: content width up to 80% of the row,
   * at the `start` or `end` of the line. Pair `end` with `brand-loud` for the
   * person's own messages. Omit for an ordinary full-width item.
   */
  bubble?: ContentItemBubble;
  /** Native hover tooltip. */
  title?: string;
  /**
   * Names the item as a distinct region (`role="region"`). Omit it for an
   * ordinary item, which stays a non-landmark grouping.
   */
  ariaLabel?: string;
  /**
   * Makes the item a programmatic focus target (`tabindex="-1"`, never a tab
   * stop), for example the preferred initial focus of a NavStack view when
   * combined with `data-nav-focus` in `rootAttributes`.
   */
  focusTarget?: boolean;
  /** Keep the standard focus outline visible, such as for a drop target. */
  outlined?: boolean;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export type ContentItemProps = ContentItemBaseProps &
  (
    | {
        interactive?: false;
        action?: never;
        itemId?: never;
        selectionMode?: never;
        selected?: never;
        disabled?: never;
        /** Opt into keyboard (`0`) or programmatic (`-1`) focus. */
        tabIndex?: 0 | -1;
        /**
         * A non-selectable row of a multi-select `List` or `Grid`: renders
         * `role="row"` around a `gridcell`, with no `aria-selected` and no
         * Tab stop of its own, for content between selectable rows (an
         * activity group, a "messages skipped" divider). Its controls stay
         * reachable by Tab; arrow keys skip it.
         */
        gridRow?: boolean;
        /** Existing static `data-*` metadata remains available. */
        rootAttributes?: ContentItemRootAttributes;
      }
    | {
        /** Enable a keyboard reachable card; wire `wireContentItems` once on its containing root. */
        interactive: true;
        /** Delegated action dispatched by pointer, Enter, or Space. */
        action: string;
        itemId?: string;
        selectionMode?: ContentItemSelectionMode;
        selected?: boolean;
        disabled?: boolean;
        tabIndex?: never;
        /** An interactive item is already a row in a multi-select grid. */
        gridRow?: never;
        /** Safe app metadata; interaction attributes are component-owned. */
        rootAttributes?: ContentItemInteractiveRootAttributes;
      }
  );

/**
 * One self-contained `.kui-content` child: an 8px inline margin, a real 1px
 * border (transparent unless `framed`), 8px padding, and a rounded or pill
 * radius. It owns that whole geometry, so wrappers must not add more.
 */
export function ContentItem({
  appearance = 'transparent',
  media,
  tint,
  children,
  frame = 'none',
  flush = false,
  shape = 'rounded',
  bubble,
  title,
  ariaLabel,
  focusTarget = false,
  outlined = false,
  tabIndex,
  gridRow = false,
  interactive = false,
  action,
  itemId,
  selectionMode = 'none',
  selected = false,
  disabled = false,
  className = '',
  rootAttributes = {},
  slot,
}: ContentItemProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    interactive
      ? interactiveProtectedAttributes
      : contentItemProtectedAttributes,
  );
  if (interactive && !action) {
    throw new Error('Interactive ContentItem requires an action');
  }
  if (interactive && selected && selectionMode === 'none') {
    throw new Error('Selected ContentItem requires a selectionMode');
  }
  if (
    media?.aspectRatio !== undefined &&
    (!Number.isFinite(media.aspectRatio) || media.aspectRatio <= 0)
  )
    throw new RangeError('ContentItem media.aspectRatio must be positive.');
  if (media?.position !== undefined && !mediaPositions.has(media.position))
    throw new TypeError(
      'ContentItem media.position must be a supported position.',
    );
  if (media?.blur !== undefined && media.blurredSrc !== undefined)
    throw new TypeError(
      'ContentItem media.blur and blurredSrc cannot be combined.',
    );
  if (media) mediaParallax(media.parallax ?? 'subtle');
  const tinted = surfaceTintAttributes(media ? tint : undefined);
  const fadeStyle =
    media?.fadeTo === undefined
      ? undefined
      : `--_kui-content-item-media-fade-to:${media.fadeTo}`;
  const cls = [
    'kui-content-item',
    shape === 'pill' ? 'kui-content-item--pill' : '',
    frame === 'framed' ? 'kui-content-item--framed' : '',
    flush ? 'kui-content-item--flush' : '',
    tinted.className,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const interactiveAttributes = interactive
    ? {
        'data-interactive': 'true',
        'data-action': disabled ? undefined : action,
        'data-item-id': itemId,
        'data-selection-mode': selectionMode,
        'data-selected':
          selectionMode === 'none' ? undefined : String(selected),
        'data-disabled': disabled ? 'true' : undefined,
      }
    : {};
  let role: 'option' | 'row' | 'button' | 'region' | undefined = ariaLabel
    ? 'region'
    : undefined;
  if (interactive) role = roleForSelectionMode(selectionMode);
  else if (gridRow) role = 'row';
  return (
    <div
      {...safeRootAttributes}
      {...interactiveAttributes}
      class={cls}
      style={[tinted.style, fadeStyle].filter(Boolean).join(';') || undefined}
      title={title}
      data-component="content-item"
      data-appearance={appearance}
      data-outlined={outlined ? 'true' : undefined}
      data-bubble={bubble}
      data-grid-row={!interactive && gridRow ? 'true' : undefined}
      data-media-state={media ? 'pending' : undefined}
      data-media-edge={media?.edgeToEdge ? 'true' : undefined}
      data-media-fade={media?.fadeTo === undefined ? undefined : 'true'}
      data-kui-tint={tinted['data-kui-tint']}
      data-kui-tint-accent={tinted['data-kui-tint-accent']}
      role={role}
      aria-label={ariaLabel}
      aria-selected={
        interactive &&
        (selectionMode === 'single' || selectionMode === 'multiple')
          ? String(selected)
          : undefined
      }
      aria-pressed={
        interactive && selectionMode === 'toggle' ? String(selected) : undefined
      }
      aria-disabled={interactive && disabled ? 'true' : undefined}
      tabindex={
        interactive
          ? disabled
            ? '-1'
            : '0'
          : (tabIndex ?? (focusTarget ? '-1' : undefined))
      }
      slot={slot}
    >
      {media ? (
        <div
          class="kui-content-item__media"
          data-tint-scheme={tinted['data-kui-tint']}
          data-tint-accent={tinted['data-kui-tint-accent']}
        >
          <BackdropImage
            src={media.src}
            srcset={media.srcset}
            sizes={media.sizes}
            alt={media.alt}
            aspectRatio={media.aspectRatio ?? 16 / 9}
            position={media.position}
            parallax={media.parallax ?? 'subtle'}
            blur={
              media.blur ??
              (media.blurredSrc ? { blurredSrc: media.blurredSrc } : undefined)
            }
            fadeTo={media.fadeTo}
            overlay={media.overlay}
            scrim={media.scrim}
            loading="lazy"
            bleedInline={false}
          />
        </div>
      ) : null}
      {media ? (
        <div
          class="kui-content-item__body"
          role={
            (interactive && selectionMode === 'multiple') ||
            (!interactive && gridRow)
              ? 'gridcell'
              : undefined
          }
        >
          {children}
        </div>
      ) : (interactive && selectionMode === 'multiple') ||
        (!interactive && gridRow) ? (
        <div role="gridcell">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

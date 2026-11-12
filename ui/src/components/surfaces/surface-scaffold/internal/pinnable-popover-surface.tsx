// KF-0MY6JQ: PinnablePopoverSurface, one of the four surfaces the
// `@kerfjs/ui/surface-scaffold` facade re-exports.
import { Pin, X } from 'lucide';

import type { KerfUiContent } from '../../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../../shared/styles/css-values.js';
import { LucideIcon } from '../../../media/lucide-icon/lucide-icon.js';
import type {
  DialogSurfaceBodyLayout,
  DialogSurfaceHeight,
  DialogSurfaceMaxHeight,
  DialogSurfaceSize,
  SurfaceInset,
} from './dialog-surface.js';
import type { PopoverDialogSurfaceDataAttributes } from './popover-dialog-surface.js';
import type { SurfacePresentation } from './surface-presentation.js';

/**
 * Where a PinnablePopoverSurface appears: the top layer, or in flow. An alias
 * of the shared {@link SurfacePresentation}.
 */
export type PinnablePopoverSurfacePresentation = SurfacePresentation;

export interface PinnablePopoverSurfaceProps {
  /**
   * The root id: what an opening control's `popoverTarget` names. The title
   * and the move description derive their ids from it.
   */
  id: string;
  /** The title text: the surface's accessible name and its move handle's. */
  label: string;
  /**
   * Id of the element whose text describes the surface, rendered as
   * `aria-describedby` on the `role="dialog"` root.
   */
  describedBy?: string;
  /** The body content, below the header. */
  children: KerfUiContent;
  /**
   * Controls before the Pin and Close buttons in the header (the only header
   * controls when both are omitted).
   */
  headerActions?: KerfUiContent;
  /**
   * `overlay` (default) is a native `popover="manual"` in the top layer that
   * `wirePinnablePopover` places, dismisses, and moves; `embedded` renders
   * the same surface in flow for a catalog or a design canvas.
   */
  presentation?: PinnablePopoverSurfacePresentation;
  /**
   * Render it pinned: an `embedded` preview of the pinned state. An
   * overlay's pinned state belongs to `wirePinnablePopover`; pass `pinned`
   * there to restore it.
   */
  pinned?: boolean;
  /** Preferred width preset: 400px, 560px (default), or 800px. */
  size?: DialogSurfaceSize;
  /** Preferred width; takes precedence over `size`, within the viewport cap. */
  preferredWidth?: CssLength;
  /** Definite height, bounded by the dynamic viewport minus both gutters. */
  height?: DialogSurfaceHeight;
  /** Minimum height, capped by maxHeight and the available viewport. Resizable overlays default to 160px. */
  minHeight?: CssLength;
  /** Height cap, bounded the same way, for a surface that sizes to content. */
  maxHeight?: DialogSurfaceMaxHeight;
  /**
   * Edge clearance on each side of the viewport (default 16px): the surface
   * is placed, dragged, and moved inside it.
   */
  viewportGutter?: CssLength;
  /**
   * Body layout (default `flow`); `fill` lets one child own the body and
   * `fill-last` stacks fixed rows above one filling last child.
   */
  bodyLayout?: DialogSurfaceBodyLayout;
  /** Body edge clearance; none lets content owners meet the surface edges. Default default (8px). */
  bodyInset?: SurfaceInset;
  /** Add a bottom-edge handle that resizes by drag or arrow key without changing pin state. */
  resizeFromBottom?: boolean;
  /**
   * `false` makes it a persistent floating panel: always pinned, with no Pin
   * toggle, it never re-anchors or closes on a press outside (KF-850ZRF).
   * It still drags by its title, moves with the arrow keys, resizes, and
   * stays inside the viewport gutter. Default `true`.
   */
  pinnable?: boolean;
  /**
   * `false` omits the header Close button, for a surface whose visibility an
   * application control owns (it calls `hidePopover()` or toggles a
   * `popoverTarget`). Escape then closes it only when `wirePinnablePopover`
   * is given `closeOnEscape: true`. Default `true`.
   */
  closable?: boolean;
  /** The Pin toggle's accessible name (default `Pin`); unused when not pinnable. */
  pinLabel?: string;
  /** The close button's accessible name (default `Close`). */
  closeLabel?: string;
  /** The move handle's accessible description of the pointer and keyboard move. */
  moveDescription?: string;
  rootAttributes?: PopoverDialogSurfaceDataAttributes;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

const PINNABLE_POPOVER_PROTECTED = new Set([
  'data-component',
  'data-presentation',
  'data-size',
  'data-height',
  'data-min-height',
  'data-max-height',
  'data-body-layout',
  'data-body-inset',
  'data-pinned',
  'data-placed',
  'data-scrolled',
  'data-resize-from-bottom',
  'data-persistent',
  'data-closable',
]);

const DEFAULT_MOVE_DESCRIPTION =
  'Drag the title or press the arrow keys to move it; hold Shift to move farther. Moving it pins it.';

/**
 * A non-modal surface a person can pin and move. Transient by default: it
 * opens below the control that opened it and closes on Escape or a press
 * outside. Pinned (by its header Pin toggle or `pinPopover()`), it stays
 * open while the page is used, drags by its title, moves with the arrow
 * keys, resizes, and stays inside the viewport gutter. Open it with a
 * `popoverTarget` control or `showPopover()`, and call `wirePinnablePopover()`
 * once for its placement, dismissal, and movement; the application stores
 * what `onChange` reports. `pinnable={false}` makes it a persistent floating
 * panel and `closable={false}` leaves its visibility to an application
 * control. Use `PopoverDialogSurface` for a dialog that only ever
 * light-dismisses.
 */
export function PinnablePopoverSurface({
  id,
  label,
  describedBy,
  children,
  headerActions,
  presentation = 'overlay',
  pinned = false,
  size = 'medium',
  preferredWidth,
  height,
  minHeight,
  maxHeight,
  viewportGutter,
  bodyLayout = 'flow',
  bodyInset = 'default',
  resizeFromBottom = false,
  pinnable = true,
  closable = true,
  pinLabel = 'Pin',
  closeLabel = 'Close',
  moveDescription = DEFAULT_MOVE_DESCRIPTION,
  rootAttributes = {},
  className = '',
  slot,
}: PinnablePopoverSurfaceProps) {
  const style = [
    preferredWidth === undefined
      ? ''
      : `--_kui-pinnable-popover-surface-preferred-width:${preferredWidth}`,
    viewportGutter === undefined
      ? ''
      : `--_kui-pinnable-popover-surface-gutter:${viewportGutter}`,
    height === undefined || height === 'viewport'
      ? ''
      : `--_kui-pinnable-popover-surface-height:${height}`,
    minHeight === undefined
      ? ''
      : `--_kui-pinnable-popover-surface-min-height:${minHeight}`,
    maxHeight === undefined || maxHeight === 'viewport'
      ? ''
      : `--_kui-pinnable-popover-surface-max-height:${maxHeight}`,
  ]
    .filter(Boolean)
    .join(';');
  const overlay = presentation === 'overlay';
  const shownPinned = pinned || !pinnable;
  return (
    <section
      {...filterDataAttributes(rootAttributes, PINNABLE_POPOVER_PROTECTED)}
      id={id}
      class={`kui-pinnable-popover-surface ${className}`.trim()}
      data-component="pinnable-popover-surface"
      data-presentation={presentation}
      data-size={size}
      data-height={height === undefined ? undefined : ''}
      data-min-height={minHeight === undefined ? undefined : ''}
      data-max-height={maxHeight === undefined ? undefined : ''}
      data-body-layout={bodyLayout === 'flow' ? undefined : bodyLayout}
      data-body-inset={bodyInset === 'compact' ? 'default' : bodyInset}
      data-resize-from-bottom={resizeFromBottom ? '' : undefined}
      data-pinned={shownPinned ? '' : undefined}
      data-persistent={pinnable ? undefined : ''}
      data-closable={closable ? undefined : 'false'}
      popover={overlay ? 'manual' : undefined}
      role="dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={describedBy}
      style={style || undefined}
      slot={slot}
    >
      <header class="kui-pinnable-popover-surface__header">
        <button
          type="button"
          class="kui-pinnable-popover-surface__handle"
          aria-describedby={`${id}-move-description`}
        >
          <span id={`${id}-title`} class="kui-pinnable-popover-surface__title">
            {label}
          </span>
        </button>
        <span id={`${id}-move-description`} hidden>
          {moveDescription}
        </span>
        <div class="kui-pinnable-popover-surface__header-actions">
          {headerActions}
          {pinnable ? (
            <button
              type="button"
              class="kui-pinnable-popover-surface__control"
              aria-label={pinLabel}
              aria-pressed={String(pinned)}
              data-pinnable-popover-pin=""
            >
              <LucideIcon icon={Pin} name="pin" size="m" />
            </button>
          ) : undefined}
          {closable ? (
            <button
              type="button"
              class="kui-pinnable-popover-surface__control"
              aria-label={closeLabel}
              popoverTarget={overlay ? id : undefined}
              popoverTargetAction={overlay ? 'hide' : undefined}
            >
              <LucideIcon icon={X} name="x" size="l" />
            </button>
          ) : undefined}
        </div>
      </header>
      <div class="kui-pinnable-popover-surface__body">{children}</div>
      {resizeFromBottom && overlay ? (
        <button
          type="button"
          class="kui-pinnable-popover-surface__bottom-resize"
          aria-label={`Resize ${label} vertically`}
          title={`Resize ${label} vertically`}
        />
      ) : undefined}
    </section>
  );
}

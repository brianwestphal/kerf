import { X } from 'lucide';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../shared/styles/css-values.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';

export {
  closeDialog,
  type DialogCloseSource,
  type DialogRequestCloseDetail,
  openDialog,
} from './internal/dialog-surface-controller.js';

export type DialogSurfaceSize = 'small' | 'medium' | 'large';
/**
 * How the dialog is presented: `modal` (default) centered on the screen,
 * `side-sheet` against the inline end, `fullscreen`, or `bottom-sheet`
 * attached to the bottom edge (square bottom corners, safe-area and
 * virtual-keyboard clearance, optionally user-resizable).
 */
export type DialogSurfacePresentation =
  'modal' | 'side-sheet' | 'fullscreen' | 'bottom-sheet';
/**
 * How a bottom sheet appears or leaves: `slide` (default) moves the panel in
 * from, or out to, the bottom edge; `standard` keeps the dialog's
 * scale-and-fade. Both honor `prefers-reduced-motion`.
 */
export type DialogSurfaceSheetMotion = 'slide' | 'standard';
export type SurfaceInset = 'none' | 'compact' | 'comfortable';
export type DialogSurfaceMaxHeight = CssLength | 'viewport';
/** A definite modal height: a length or the full viewport, minus both gutters. */
export type DialogSurfaceHeight = CssLength | 'viewport';
/**
 * How the dialog body lays out its children: `flow` (default) scrolls ordinary
 * content in the body; `fill` gives one child the body's whole height and
 * lets it own scrolling (a SplitView, a Pane, an editor); `fill-last` stacks
 * the leading children at their natural height and gives the last child the
 * remaining height to own its scrolling (a heading and notices above a
 * scrolling transcript).
 */
export type DialogSurfaceBodyLayout = 'flow' | 'fill' | 'fill-last';
/**
 * Where the dialog footer sits: `docked` (default) below the body, or
 * `floating` over the body's block end, inset from the panel's inline and
 * block-end edges on a transparent background (a chat composer).
 */
export type DialogSurfaceFooterPresentation = 'docked' | 'floating';
/**
 * Where the dialog header sits: `docked` (default) above the body, or
 * `floating` over the body's block-start edge on the translucent chrome
 * material, so content scrolls visibly beneath the title bar.
 */
export type DialogSurfaceHeaderPresentation = 'docked' | 'floating';

/**
 * Application `data-*` identity on the DialogSurface root, such as
 * `data-key`; the surface's own configuration attributes stay protected.
 */
export type DialogSurfaceRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

const DIALOG_SURFACE_PROTECTED = new Set([
  'data-component',
  'data-size',
  'data-presentation',
  'data-preferred-width',
  'data-body-inset',
  'data-footer-inset',
  'data-viewport-gutter',
  'data-max-height',
  'data-height',
  'data-body-layout',
  'data-footer-presentation',
  'data-header-presentation',
  'data-min-height',
  'data-resizable',
  'data-enter-motion',
  'data-exit-motion',
  'data-light-dismiss',
]);

/**
 * The dialog's accessible name: its `label` text (also the default title), or
 * the id of an element that names it, such as a `heading` ToolbarText.
 */
export type DialogSurfaceName =
  { label: string; labelledBy?: never } | { label?: never; labelledBy: string };

export type DialogSurfaceProps = DialogSurfaceName & DialogSurfaceOptions;

export interface DialogSurfaceOptions {
  /** The dialog's id, for `openDialog(document.getElementById(id))`. */
  id?: string;
  /**
   * Id of the element whose text is the dialog's accessible description,
   * such as the `heading` ToolbarText's `descriptionId` or app-owned summary
   * copy in the body; rendered as `aria-describedby` on the `<dialog>`.
   */
  describedBy?: string;
  /** The body content. */
  children: KerfUiContent;
  /**
   * Header title content in place of the `label` text, such as an xl
   * `ToolbarText` with a description. The dialog keeps its `label` (or
   * `labelledBy`) name.
   */
  heading?: KerfUiContent;
  /** Controls before the close button in the header. */
  headerActions?: KerfUiContent;
  /** The footer, below the body (or floating over it); usually its buttons. */
  footer?: KerfUiContent;
  /**
   * Render no header: no title and no close button. The content then owns its
   * heading and a way to close (an element with `data-dialog-close`).
   */
  withoutHeader?: boolean;
  /** Close on a press on the backdrop; otherwise the panel pulses. */
  lightDismiss?: boolean;
  /** The close button's accessible name (default `Close`). */
  closeLabel?: string;
  size?: DialogSurfaceSize;
  presentation?: DialogSurfacePresentation;
  /** Modal preferred width. Takes precedence over size, within the viewport cap. */
  preferredWidth?: CssLength;
  bodyInset?: SurfaceInset;
  footerInset?: SurfaceInset;
  /** Modal edge clearance. Omit to retain Web Awesome's default viewport cap. */
  viewportGutter?: CssLength;
  /**
   * Modal height cap, bounded by the dynamic viewport minus both gutters. On a
   * bottom sheet, the cap (and the resize ceiling), bounded by the dynamic
   * viewport minus the top safe area and one gutter.
   */
  maxHeight?: DialogSurfaceMaxHeight;
  /**
   * Modal definite height, bounded the same way, so a filling child has a
   * height to fill. Takes precedence over `maxHeight`. On a bottom sheet, the
   * height it opens at (the visible height above the safe area or keyboard).
   */
  height?: DialogSurfaceHeight;
  /**
   * A resizable bottom sheet's resize floor (default 160px), the visible
   * height above the safe area or keyboard.
   */
  minHeight?: CssLength;
  /**
   * Let the person resize a bottom sheet by its top grabber (drag, or the
   * arrow, Page Up/Down, Home and End keys) between `minHeight` and the
   * sheet's cap. Needs the `/register` entry; each opening starts at `height`
   * (or the content height). Ignored by other presentations.
   */
  resizable?: boolean;
  /** How a bottom sheet appears (default `slide` up from the bottom edge). */
  enterMotion?: DialogSurfaceSheetMotion;
  /** How a bottom sheet is dismissed (default `slide` down off the bottom edge). */
  exitMotion?: DialogSurfaceSheetMotion;
  /**
   * Body layout (default `flow`); `fill` lets one child own the body and
   * `fill-last` stacks fixed rows above one filling last child.
   */
  bodyLayout?: DialogSurfaceBodyLayout;
  /**
   * Header placement (default `docked`); `floating` lays the dialog's header
   * (its title and close control) over the body's block-start edge on the
   * translucent chrome material (`--kui-chrome-material-raised`, opaque under
   * `prefers-reduced-transparency`, increased contrast, forced colors, or
   * without `backdrop-filter`). The `/register` entry measures the header;
   * the body reserves that height before its own inset, so its first content
   * rests below the title bar. A `fill`/`fill-last` child that is the body's
   * only child and opts into block-start `scrollClearance` (a `List` or
   * `Pane`) takes the clearance inside its own scroll area instead, published
   * as `--kui-scroll-clearance-block-start`, so its content scrolls visibly
   * beneath the header. Unmeasured (without the register), the header stays
   * docked. Keep header text in the normal text color: quiet text can fall
   * below AA over the content passing beneath it.
   */
  headerPresentation?: DialogSurfaceHeaderPresentation;
  /**
   * Footer placement (default `docked`); `floating` lays the footer over the
   * body's block end. The body reserves the footer's measured height so its
   * last content is never hidden beneath it. A `fill`/`fill-last` child that
   * opts into block-end `scrollClearance` (a `List` or `Pane`) takes that
   * clearance inside its own scroll area instead, published as
   * `--kui-scroll-clearance-block-end`, so its content scrolls visibly beneath
   * the transparent footer.
   */
  footerPresentation?: DialogSurfaceFooterPresentation;
  /**
   * A floating footer's clearance from the panel's inline and block-end edges
   * (default the 16px container inset). Choose a phone value such as
   * `remify(8)` from `deviceClass()`; the scaffold adds no breakpoint.
   */
  footerOffset?: CssLength;
  /**
   * Safe `data-*` identity on the root. Give sibling dialogs distinct
   * `data-key`s so a re-render morphs each surface into itself instead of
   * reusing one dialog's element for another (structurally identical roots
   * are otherwise matched by position).
   */
  rootAttributes?: DialogSurfaceRootAttributes;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A modal dialog: a native `<dialog>` with Kerf's header, body, and footer
 * chrome, sized and presented by its props. Render it closed, then open it
 * with `openDialog()` and close it with `closeDialog()`, the close button, an
 * element with `data-dialog-close`, Escape, or (with `lightDismiss`) a press
 * on the backdrop. Import `@kerfjs/ui/surface-scaffold/register` for the
 * floating header and footer measurement, the bottom sheet's keyboard
 * clearance and grabber, and re-render resilience while open.
 */
export function DialogSurface({
  id,
  label,
  labelledBy,
  describedBy,
  heading,
  headerActions,
  footer,
  withoutHeader = false,
  lightDismiss = false,
  closeLabel = 'Close',
  children,
  size = 'medium',
  presentation = 'modal',
  preferredWidth,
  bodyInset = 'compact',
  footerInset = 'comfortable',
  viewportGutter,
  maxHeight,
  height,
  minHeight,
  resizable = false,
  enterMotion = 'slide',
  exitMotion = 'slide',
  bodyLayout = 'flow',
  headerPresentation = 'docked',
  footerPresentation = 'docked',
  footerOffset,
  rootAttributes = {},
  className = '',
  slot,
}: DialogSurfaceProps) {
  const style = [
    preferredWidth === undefined
      ? ''
      : `--_kui-dialog-surface-preferred-width:${preferredWidth}`,
    viewportGutter === undefined
      ? ''
      : `--_kui-dialog-surface-gutter:${viewportGutter}`,
    maxHeight === undefined || maxHeight === 'viewport'
      ? ''
      : `--_kui-dialog-surface-max-height:${maxHeight}`,
    height === undefined || height === 'viewport'
      ? ''
      : `--_kui-dialog-surface-height:${height}`,
    footerOffset === undefined
      ? ''
      : `--_kui-dialog-surface-footer-offset:${footerOffset}`,
    minHeight === undefined
      ? ''
      : `--_kui-dialog-surface-min-height:${minHeight}`,
  ]
    .filter(Boolean)
    .join(';');
  return (
    <dialog
      {...filterDataAttributes(rootAttributes, DIALOG_SURFACE_PROTECTED)}
      id={id}
      class={`kui-dialog-surface ${className}`.trim()}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabindex={-1}
      data-light-dismiss={lightDismiss ? '' : undefined}
      data-component="dialog-surface"
      data-size={size}
      data-presentation={presentation}
      data-preferred-width={preferredWidth === undefined ? undefined : ''}
      data-body-inset={bodyInset}
      data-footer-inset={footerInset}
      data-viewport-gutter={viewportGutter === undefined ? undefined : ''}
      data-max-height={maxHeight === undefined ? undefined : ''}
      data-height={height === undefined ? undefined : ''}
      data-body-layout={bodyLayout === 'flow' ? undefined : bodyLayout}
      data-header-presentation={
        headerPresentation === 'floating' ? 'floating' : undefined
      }
      data-footer-presentation={
        footerPresentation === 'floating' ? 'floating' : undefined
      }
      data-min-height={minHeight === undefined ? undefined : ''}
      data-resizable={resizable ? '' : undefined}
      data-enter-motion={enterMotion === 'slide' ? undefined : enterMotion}
      data-exit-motion={exitMotion === 'slide' ? undefined : exitMotion}
      style={style || undefined}
      slot={slot}
    >
      {withoutHeader ? null : (
        <header class="kui-dialog-surface__header">
          {heading === undefined ? (
            <h2 class="kui-dialog-surface__title">{label}</h2>
          ) : (
            <div class="kui-dialog-surface__title">{heading}</div>
          )}
          <div class="kui-dialog-surface__header-actions">
            {headerActions}
            <button
              type="button"
              class="kui-dialog-surface__close"
              aria-label={closeLabel}
              data-dialog-close=""
            >
              <LucideIcon icon={X} name="x" size="l" />
            </button>
          </div>
        </header>
      )}
      {presentation === 'bottom-sheet' && resizable ? (
        <div
          class="kui-dialog-surface__sheet-handle"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize sheet"
          tabindex={0}
        />
      ) : null}
      <div class="kui-dialog-surface__body">{children}</div>
      {footer === undefined ? null : (
        <footer class="kui-dialog-surface__footer">{footer}</footer>
      )}
      {/* Where kerfjs/overlay hosts a popover or tooltip opened inside the
          modal dialog, so it stays interactive above the inert page. */}
      <div data-kerf-overlay-host data-morph-skip style="display:contents" />
    </dialog>
  );
}

/** Where a PopoverDialogSurface appears: the top layer, or in flow. */
export type PopoverDialogSurfacePresentation = 'overlay' | 'embedded';

/** Application `data-*` metadata on the surface root. */
export type PopoverDialogSurfaceDataAttributes = Readonly<
  Record<`data-${string}`, string>
>;

type PopoverDialogSurfaceName =
  { label: string; labelledBy?: never } | { label?: never; labelledBy: string };

export type PopoverDialogSurfaceProps = PopoverDialogSurfaceName & {
  /** The root id: what an opening control's `popovertarget` names. */
  id?: string;
  /**
   * Id of the element whose text is the dialog's accessible description,
   * such as a title `ToolbarText`'s `descriptionId`; rendered as
   * `aria-describedby` on the `role="dialog"` root.
   */
  describedBy?: string;
  children: KerfUiContent;
  /**
   * `overlay` (default) is a native `popover="auto"` in the top layer:
   * non-modal, light dismiss (Escape or a press outside), nothing inert.
   * `embedded` renders the same surface in flow for a catalog or inline use.
   */
  presentation?: PopoverDialogSurfacePresentation;
  /** Preferred width preset: 400px, 560px (default), or 800px. */
  size?: DialogSurfaceSize;
  /** Preferred width; takes precedence over `size`, within the viewport cap. */
  preferredWidth?: CssLength;
  /** Definite height, bounded by the dynamic viewport minus both gutters. */
  height?: DialogSurfaceHeight;
  /** Height cap, bounded the same way, for a surface that sizes to content. */
  maxHeight?: DialogSurfaceMaxHeight;
  /** Edge clearance on each side of the viewport (default 16px). */
  viewportGutter?: CssLength;
  /**
   * Body layout (default `flow`); `fill` lets one child own the surface and
   * `fill-last` stacks fixed rows above one filling last child.
   */
  bodyLayout?: DialogSurfaceBodyLayout;
  rootAttributes?: PopoverDialogSurfaceDataAttributes;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
};

const POPOVER_DIALOG_PROTECTED = new Set([
  'data-component',
  'data-presentation',
  'data-size',
  'data-height',
  'data-max-height',
  'data-body-layout',
]);

/**
 * A non-modal dialog surface on the native Popover API: Kerf's dialog chrome,
 * viewport-bounded size, and single-child fill without application CSS.
 * Open it with a `popovertarget` control or `showPopover()`; it light
 * dismisses and leaves the page interactive. Use `DialogSurface` when the
 * task must block the page.
 */
export function PopoverDialogSurface({
  id,
  children,
  label,
  labelledBy,
  describedBy,
  presentation = 'overlay',
  size = 'medium',
  preferredWidth,
  height,
  maxHeight,
  viewportGutter,
  bodyLayout = 'flow',
  rootAttributes = {},
  className = '',
  slot,
}: PopoverDialogSurfaceProps) {
  const style = [
    preferredWidth === undefined
      ? ''
      : `--_kui-popover-dialog-surface-preferred-width:${preferredWidth}`,
    viewportGutter === undefined
      ? ''
      : `--_kui-popover-dialog-surface-gutter:${viewportGutter}`,
    height === undefined || height === 'viewport'
      ? ''
      : `--_kui-popover-dialog-surface-height:${height}`,
    maxHeight === undefined || maxHeight === 'viewport'
      ? ''
      : `--_kui-popover-dialog-surface-max-height:${maxHeight}`,
  ]
    .filter(Boolean)
    .join(';');
  return (
    <section
      {...filterDataAttributes(rootAttributes, POPOVER_DIALOG_PROTECTED)}
      id={id}
      class={`kui-popover-dialog-surface ${className}`.trim()}
      data-component="popover-dialog-surface"
      data-presentation={presentation}
      data-size={size}
      data-height={height === undefined ? undefined : ''}
      data-max-height={maxHeight === undefined ? undefined : ''}
      data-body-layout={bodyLayout === 'flow' ? undefined : bodyLayout}
      popover={presentation === 'overlay' ? 'auto' : undefined}
      role="dialog"
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      style={style || undefined}
      slot={slot}
    >
      {children}
    </section>
  );
}

export type PopupSurfaceInset = 'standard' | 'compact' | 'list-zero';

export interface PopupSurfaceProps {
  children: KerfUiContent;
  inset?: PopupSurfaceInset;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** Configure recurring Web Awesome dropdown-menu geometry without consumer ::part() CSS. */
export function PopupSurface({
  children,
  inset = 'standard',
  className = '',
  slot,
}: PopupSurfaceProps) {
  return (
    <span
      class={`kui-popup-surface ${className}`.trim()}
      data-component="popup-surface"
      data-inset={inset}
      slot={slot}
    >
      {children}
    </span>
  );
}

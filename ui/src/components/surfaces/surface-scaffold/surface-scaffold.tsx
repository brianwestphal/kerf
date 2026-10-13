import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../shared/styles/css-values.js';

export type DialogSurfaceSize = 'small' | 'medium' | 'large';
export type DialogSurfacePresentation = 'modal' | 'side-sheet' | 'fullscreen';
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
]);

export interface DialogSurfaceProps {
  children: KerfUiContent;
  size?: DialogSurfaceSize;
  presentation?: DialogSurfacePresentation;
  /** Modal preferred width. Takes precedence over size, within the viewport cap. */
  preferredWidth?: CssLength;
  bodyInset?: SurfaceInset;
  footerInset?: SurfaceInset;
  /** Modal edge clearance. Omit to retain Web Awesome's default viewport cap. */
  viewportGutter?: CssLength;
  /** Modal height cap, bounded by the dynamic viewport minus both gutters. */
  maxHeight?: DialogSurfaceMaxHeight;
  /**
   * Modal definite height, bounded the same way, so a filling child has a
   * height to fill. Takes precedence over `maxHeight`.
   */
  height?: DialogSurfaceHeight;
  /**
   * Body layout (default `flow`); `fill` lets one child own the body and
   * `fill-last` stacks fixed rows above one filling last child.
   */
  bodyLayout?: DialogSurfaceBodyLayout;
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

/** Configure recurring Web Awesome dialog geometry without consumer ::part() CSS. */
export function DialogSurface({
  children,
  size = 'medium',
  presentation = 'modal',
  preferredWidth,
  bodyInset = 'compact',
  footerInset = 'comfortable',
  viewportGutter,
  maxHeight,
  height,
  bodyLayout = 'flow',
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
  ]
    .filter(Boolean)
    .join(';');
  return (
    <div
      {...filterDataAttributes(rootAttributes, DIALOG_SURFACE_PROTECTED)}
      class={`kui-dialog-surface ${className}`.trim()}
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
      data-footer-presentation={
        footerPresentation === 'floating' ? 'floating' : undefined
      }
      style={style || undefined}
      slot={slot}
    >
      {children}
    </div>
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
 * dismisses and leaves the page interactive. Use `DialogSurface` with
 * `wa-dialog` when the task must block the page.
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

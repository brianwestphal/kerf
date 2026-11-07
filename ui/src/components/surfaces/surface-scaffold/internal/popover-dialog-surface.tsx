// KF-0MY6JQ: PopoverDialogSurface, one of the four surfaces the
// `@kerfjs/ui/surface-scaffold` facade re-exports.
import type { KerfUiContent } from '../../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../../shared/dom/extension-attributes.js';
import {
  type AnchorName,
  checkedAnchorName,
} from '../../../../shared/styles/anchor-name.js';
import type { CssLength } from '../../../../shared/styles/css-values.js';
import type {
  DialogSurfaceBodyLayout,
  DialogSurfaceHeight,
  DialogSurfaceMaxHeight,
  DialogSurfaceSize,
} from './dialog-surface.js';
import type { SurfacePresentation } from './surface-presentation.js';

/**
 * Where a PopoverDialogSurface appears: the top layer, or in flow. An alias
 * of the shared {@link SurfacePresentation}.
 */
export type PopoverDialogSurfacePresentation = SurfacePresentation;

/** How an overlay PopoverDialogSurface closes: light dismiss, or its own controls. */
export type PopoverDialogSurfaceDismiss = 'light' | 'manual';

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
  /**
   * How an overlay closes. `light` (default) is `popover="auto"`: Escape or a
   * press outside closes it. `manual` is `popover="manual"`: only its own
   * controls (`popovertargetaction="hide"`) or `hidePopover()` close it, for a
   * request the person must answer. Ignored when `embedded`.
   */
  dismiss?: PopoverDialogSurfaceDismiss;
  /**
   * KF-T1V86Q: a CSS anchor name (a dashed ident such as `--app-main`) the
   * open overlay docks to: centered on the bottom edge of the element whose
   * `anchor-name` it is, inset by `viewportGutter`. The application names
   * that element (its shell's main column). Engines without CSS anchor
   * positioning keep the centered top-layer placement. Ignored when
   * `embedded`.
   */
  anchorName?: AnchorName;
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
  'data-anchored',
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
  dismiss = 'light',
  anchorName,
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
  if (anchorName !== undefined)
    checkedAnchorName(anchorName, 'PopoverDialogSurface anchorName');
  const anchored = anchorName !== undefined && presentation === 'overlay';
  const style = [
    anchored ? `position-anchor:${anchorName}` : '',
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
      data-anchored={anchored ? '' : undefined}
      popover={
        presentation !== 'overlay'
          ? undefined
          : dismiss === 'manual'
            ? 'manual'
            : 'auto'
      }
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

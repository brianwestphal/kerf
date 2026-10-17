import { X } from 'lucide';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import type { CssLength } from '../../../shared/styles/css-values.js';
import { remify } from '../../../shared/styles/css-values.js';
import { ToolbarControlGroup } from '../../actions/toolbar-control-group/toolbar-control-group.js';
import { ToolbarText } from '../../actions/toolbar-text/toolbar-text.js';
import {
  Workbench,
  type WorkbenchMainBottomToolbar,
  type WorkbenchPanel,
} from '../../layout/workbench/workbench.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';
import {
  DialogSurface,
  type DialogSurfaceHeight,
  type DialogSurfaceMaxHeight,
  type DialogSurfaceRootAttributes,
  type DialogSurfaceSize,
} from '../surface-scaffold/surface-scaffold.js';

// Open and close it like any DialogSurface, from the same import.
export {
  closeDialog,
  type DialogCloseSource,
  type DialogRequestCloseDetail,
  openDialog,
} from '../surface-scaffold/surface-scaffold.js';

/**
 * Application `data-*` identity on the dialog root, such as `data-key`; the
 * dialog's own configuration attributes stay protected.
 */
export type WorkbenchDialogRootAttributes = DialogSurfaceRootAttributes;

export interface WorkbenchDialogProps {
  /**
   * The dialog's id, for `openDialog(document.getElementById(id))`. The
   * Workbench inside is `<id>-workbench`, so its rails are
   * `<id>-workbench-left-rail` and `<id>-workbench-right-rail`.
   */
  id: string;
  /** The dialog's accessible name. */
  label: string;
  /** The dialog's primary title: an xl heading in the work area's toolbar. */
  title: string;
  /**
   * A short supporting line under the title. It is the dialog's accessible
   * description (`aria-describedby` to its `<id>-description`) unless
   * `describedBy` names other content.
   */
  description?: string;
  /**
   * Id of the element whose text is the dialog's accessible description, in
   * place of `description`, such as app-owned summary copy in `main`.
   */
  describedBy?: string;
  /** Groups after the title in the work area's toolbar. */
  leading?: KerfUiContent;
  /** Header controls before the close control, such as a `ToolbarControlGroup`. */
  actions?: KerfUiContent;
  /** The work area. */
  main: KerfUiContent;
  /** Fixed content over the work area's bottom toolbar, such as a status line. */
  mainFooter?: KerfUiContent;
  /** The work area's bottom toolbar, usually the dialog's buttons. */
  mainBottomToolbar?: WorkbenchMainBottomToolbar;
  /**
   * Side rails with their own toolbars. On compact devices each presents as
   * an overlay over the work area; the app starts it collapsed and its
   * `toolbar.toggle` shows it.
   */
  leftRail?: WorkbenchPanel;
  rightRail?: WorkbenchPanel;
  /** A bottom drawer under the work area. */
  bottomDrawer?: WorkbenchPanel;
  /**
   * Fill the screen with the rails as overlays: derive from
   * `deviceClass().value.compact`.
   */
  compact?: boolean;
  /** The close control's accessible name (default `Close`). */
  closeLabel?: string;
  /** Close on a press on the backdrop; otherwise the panel pulses. */
  lightDismiss?: boolean;
  /** Roomy preferred width preset (default `large`). */
  size?: DialogSurfaceSize;
  /** Roomy preferred width; takes precedence over `size`. */
  preferredWidth?: CssLength;
  /** Roomy definite height (default 560px), bounded by the viewport. */
  height?: DialogSurfaceHeight;
  /** Roomy height cap in place of a definite height. */
  maxHeight?: DialogSurfaceMaxHeight;
  /** Roomy edge clearance from the viewport. */
  viewportGutter?: CssLength;
  /** Minimum work-area width beside inline rails, in px (Workbench default 320). */
  mainMinSize?: number;
  rootAttributes?: WorkbenchDialogRootAttributes;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** A rail presents as an overlay in a compact dialog, as the app left it otherwise. */
function compactRail(
  panel: WorkbenchPanel | undefined,
  compact: boolean,
): WorkbenchPanel | undefined {
  return panel && compact ? { ...panel, presentation: 'overlay' } : panel;
}

/**
 * A workbench dialog: a modal whose body is a `Workbench`. The work area's
 * toolbar carries the dialog's primary title, its actions, and the close
 * control; side rails keep their own toolbars and run the dialog's full
 * height. On compact devices it fills the screen and its rails become
 * overlays over the work area, shown by their toolbar toggles, so the work
 * area keeps its width. Open it with `openDialog()`; the app owns each
 * rail's `collapsed` state, and `wireWorkbench` closes an overlay rail on
 * Escape or a press outside it before the dialog sees the Escape. Built from
 * `DialogSurface` and `Workbench`.
 */
export function WorkbenchDialog({
  id,
  label,
  title,
  description,
  describedBy,
  leading,
  actions,
  main,
  mainFooter,
  mainBottomToolbar,
  leftRail,
  rightRail,
  bottomDrawer,
  compact = false,
  closeLabel = 'Close',
  lightDismiss = false,
  size = 'large',
  preferredWidth,
  height,
  maxHeight,
  viewportGutter,
  mainMinSize,
  rootAttributes,
  className = '',
  slot,
}: WorkbenchDialogProps) {
  return (
    <DialogSurface
      id={id}
      label={label}
      describedBy={
        describedBy ??
        (description === undefined ? undefined : `${id}-description`)
      }
      withoutHeader
      lightDismiss={lightDismiss}
      closeLabel={closeLabel}
      size={size}
      presentation={compact ? 'fullscreen' : 'modal'}
      preferredWidth={preferredWidth}
      height={
        compact
          ? undefined
          : maxHeight === undefined
            ? (height ?? remify(560))
            : height
      }
      maxHeight={compact ? undefined : maxHeight}
      viewportGutter={compact ? undefined : viewportGutter}
      bodyInset="none"
      bodyLayout="fill"
      rootAttributes={{
        ...rootAttributes,
        'data-dialog-layout': 'workbench',
      }}
      className={className}
      slot={slot}
    >
      <Workbench
        id={`${id}-workbench`}
        label={label}
        mainToolbar={{
          label: title,
          title: (
            <ToolbarText
              text={title}
              description={description}
              descriptionId={
                description === undefined ? undefined : `${id}-description`
              }
              size="xlarge"
              id={`${id}-title`}
              headingLevel={2}
            />
          ),
          leading,
          trailing: actions,
          // After any hidden right rail's toggle, so Close stays outermost.
          end: (
            <ToolbarControlGroup appearance="borderless" single>
              <button
                type="button"
                aria-label={closeLabel}
                data-dialog-close=""
              >
                <LucideIcon icon={X} name="x" />
              </button>
            </ToolbarControlGroup>
          ),
        }}
        main={main}
        mainFooter={mainFooter}
        mainBottomToolbar={mainBottomToolbar}
        leftRail={compactRail(leftRail, compact)}
        rightRail={compactRail(rightRail, compact)}
        bottomDrawer={bottomDrawer}
        mainMinSize={mainMinSize}
      />
    </DialogSurface>
  );
}

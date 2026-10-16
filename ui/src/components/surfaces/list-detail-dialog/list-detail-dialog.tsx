import { X } from 'lucide';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import type { CssLength } from '../../../shared/styles/css-values.js';
import { remify } from '../../../shared/styles/css-values.js';
import { Toolbar } from '../../actions/toolbar/toolbar.js';
import { ToolbarControlGroup } from '../../actions/toolbar-control-group/toolbar-control-group.js';
import { ToolbarText } from '../../actions/toolbar-text/toolbar-text.js';
import { Pane } from '../../layout/pane/pane.js';
import {
  SplitView,
  type SplitViewListWidth,
} from '../../layout/split-view/split-view.js';
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

/** The list column: a secondary title, its own controls, and the list. */
export interface ListDetailDialogList {
  /**
   * The column's title, at the default toolbar size so it reads as pane
   * identity beside the detail's primary title. On compact devices it titles
   * the root view.
   */
  title: string;
  /** Controls after the title in the column's header, such as a `ToolbarControlGroup`. */
  toolbar?: KerfUiContent;
  /** The list, usually a `List` of selectable `ListItem`s. */
  content: KerfUiContent;
  /** Content pinned below the list, such as an add control. */
  footer?: KerfUiContent;
  /**
   * The column's width on roomy devices (default 280px, at most 40% of the
   * dialog's width).
   */
  width?: SplitViewListWidth;
}

/** The detail column: the dialog's primary title, actions, and close control. */
export interface ListDetailDialogDetail {
  /**
   * The dialog's primary title: an xl heading at the top of the detail
   * column on roomy devices, and the pushed view's title on compact devices.
   */
  title: string;
  /** A short supporting line under the roomy title. */
  description?: string;
  /**
   * Header controls before the close control, such as a
   * `ToolbarControlGroup`. Primary record actions usually go in `footer`.
   */
  actions?: KerfUiContent;
  /** The selected item's detail. */
  content: KerfUiContent;
  /** Content pinned below the detail, usually its buttons. */
  footer?: KerfUiContent;
}

/**
 * Application `data-*` identity on the dialog root, such as `data-key`; the
 * dialog's own configuration attributes stay protected.
 */
export type ListDetailDialogRootAttributes = DialogSurfaceRootAttributes;

export interface ListDetailDialogProps {
  /**
   * The dialog's id, for `openDialog(document.getElementById(id))`. Also
   * prefixes the ids of the split and the detail title.
   */
  id: string;
  /** The dialog's accessible name. */
  label: string;
  list: ListDetailDialogList;
  detail: ListDetailDialogDetail;
  /**
   * One pane at a time: derive from `deviceClass().value.compact`. The dialog
   * fills the screen and drills from the list into the detail as a
   * `NavStack`; every view keeps the close control.
   */
  compact?: boolean;
  /** On compact devices, whether the detail is pushed over the list. */
  detailActive?: boolean;
  /** The compact back control's accessible name (default `Back`). */
  backLabel?: string;
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
  rootAttributes?: ListDetailDialogRootAttributes;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

const DEFAULT_LIST_WIDTH: SplitViewListWidth = { size: 280, maxFraction: 0.4 };

function closeGroup(closeLabel: string) {
  return (
    <ToolbarControlGroup appearance="borderless" single>
      <button type="button" aria-label={closeLabel} data-dialog-close="">
        <LucideIcon icon={X} name="x" />
      </button>
    </ToolbarControlGroup>
  );
}

/**
 * A list-detail dialog: a modal whose list column and detail column each run
 * its full height. The list column carries a secondary title and its own
 * controls; the detail column carries the dialog's primary title, its
 * actions, and the close control, so the divider between them runs from top
 * to bottom. On compact devices it fills the screen and becomes a `NavStack`
 * that drills from the list into the detail. Open it with `openDialog()`;
 * the app owns the selection and, on compact devices, `detailActive` (the
 * stack's back control dispatches `nav-back`). Built from `DialogSurface`,
 * `SplitView`, and `Pane`.
 */
export function ListDetailDialog({
  id,
  label,
  list,
  detail,
  compact = false,
  detailActive = false,
  backLabel = 'Back',
  closeLabel = 'Close',
  lightDismiss = false,
  size = 'large',
  preferredWidth,
  height,
  maxHeight,
  viewportGutter,
  rootAttributes,
  className = '',
  slot,
}: ListDetailDialogProps) {
  const close = closeGroup(closeLabel);
  const split = compact ? (
    <SplitView
      id={`${id}-split`}
      label={label}
      compact
      detailActive={detailActive}
      listTitle={list.title}
      detailTitle={detail.title}
      backLabel={backLabel}
      compactStack={{
        list: {
          toolbar: {
            trailing: (
              <>
                {list.toolbar}
                {close}
              </>
            ),
          },
          footer: list.footer,
        },
        detail: {
          toolbar: {
            trailing: (
              <>
                {detail.actions}
                {close}
              </>
            ),
          },
          footer: detail.footer,
        },
      }}
      list={list.content}
      detail={detail.content}
    />
  ) : (
    <SplitView
      id={`${id}-split`}
      label={label}
      listTitle={list.title}
      detailTitle={detail.title}
      listWidth={list.width ?? DEFAULT_LIST_WIDTH}
      list={
        <Pane
          label={list.title}
          header={
            <Toolbar
              label={list.title}
              leading={<ToolbarText text={list.title} />}
              trailing={list.toolbar}
            />
          }
          footer={list.footer}
        >
          {list.content}
        </Pane>
      }
      detail={
        <Pane
          label={detail.title}
          header={
            <Toolbar
              label={detail.title}
              leading={
                <ToolbarText
                  text={detail.title}
                  description={detail.description}
                  size="xlarge"
                  id={`${id}-title`}
                  headingLevel={2}
                />
              }
              trailing={
                <>
                  {detail.actions}
                  {close}
                </>
              }
            />
          }
          footer={detail.footer}
        >
          {detail.content}
        </Pane>
      }
    />
  );
  return (
    <DialogSurface
      id={id}
      label={label}
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
        'data-dialog-layout': 'list-detail',
      }}
      className={className}
      slot={slot}
    >
      {split}
    </DialogSurface>
  );
}

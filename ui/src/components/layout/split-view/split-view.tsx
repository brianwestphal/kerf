import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { pct, remify } from '../../../shared/styles/css-values.js';
import {
  NavStack,
  type NavStackProps,
  type NavStackView,
} from '../../navigation/nav-stack/nav-stack.js';
import {
  ResizableRegion,
  type ResizableRegionProps,
} from '../resizable-region/resizable-region.js';

/**
 * The roomy list pane's `ResizableRegion`: its committed `size` and `min` /
 * `max` limits, plus the region configuration that forwards unchanged
 * (`separator`, `handleIcon`, `contentOverflow`, and collapse:
 * `collapsed`, `transitioning`, `collapseMotion`, `restoreControl`,
 * `restorePosition`). Omitted options keep the region's defaults.
 */
export interface SplitViewResizable extends Pick<
  ResizableRegionProps,
  | 'separator'
  | 'handleIcon'
  | 'contentOverflow'
  | 'collapsed'
  | 'transitioning'
  | 'collapseMotion'
  | 'restoreControl'
  | 'restorePosition'
> {
  size: number;
  min: number;
  max: number;
}

/** One compact view's top- and bottom-toolbar content (see `NavStackView`). */
export type SplitViewCompactViewToolbars = Pick<
  NavStackView,
  'toolbar' | 'bottomToolbar'
>;

/**
 * The compact `NavStack`'s configuration: its toolbar configuration, back
 * control, persistent bottom toolbar, chrome dividers, and chrome and
 * bottom-toolbar presentations forward to the stack, and `list` / `detail`
 * give each view its own toolbar groups.
 */
export interface SplitViewCompactStack extends Pick<
  NavStackProps,
  | 'toolbarConfig'
  | 'backIcon'
  | 'backText'
  | 'hideToolbar'
  | 'bottomToolbar'
  | 'chromeDividers'
  | 'chromePresentation'
  | 'bottomToolbarPresentation'
> {
  /** Toolbar content for the list (root) view. */
  list?: SplitViewCompactViewToolbars;
  /** Toolbar content for the pushed detail view. */
  detail?: SplitViewCompactViewToolbars;
}

/**
 * The fixed list column's width: a size in CSS pixels, or that size capped
 * at a fraction of the SplitView's own width so a narrow container (a
 * dialog, a small window) always leaves the detail in view.
 */
export type SplitViewListWidth =
  | number
  | {
      /** Preferred width in CSS pixels. */
      size: number;
      /** Largest share of the SplitView's width, greater than 0 and at most 1. */
      maxFraction?: number;
    };

/** The list-width custom property value for a fixed split. */
function listWidthValue(listWidth: SplitViewListWidth): string {
  const { size, maxFraction } =
    typeof listWidth === 'number'
      ? { size: listWidth, maxFraction: undefined }
      : listWidth;
  if (!Number.isFinite(size) || size <= 0)
    throw new RangeError(
      'SplitView listWidth size must be a positive number of pixels',
    );
  if (
    maxFraction !== undefined &&
    (!Number.isFinite(maxFraction) || maxFraction <= 0 || maxFraction > 1)
  )
    throw new RangeError(
      'SplitView listWidth maxFraction must be greater than 0 and at most 1',
    );
  const preferred = remify(size);
  return maxFraction === undefined
    ? preferred
    : `min(${preferred}, ${pct(maxFraction * 100)})`;
}

export interface SplitViewProps {
  id: string;
  label: string;
  /** The list (primary) pane. */
  list: KerfUiContent;
  /** The detail (secondary) pane. */
  detail: KerfUiContent;
  /**
   * Compact ("one pane at a time") classes — a handset or portrait tablet.
   * Derive from `deviceClass().value.compact`. When true the split collapses to
   * a `NavStack`: the list is the root and the detail is pushed over it.
   */
  compact?: boolean;
  /** In compact mode, whether the detail is currently pushed over the list. */
  detailActive?: boolean;
  /** Title/label for the list (compact NavStack root + region label). */
  listTitle?: string;
  /** Title/label for the detail (compact NavStack pushed view + region label). */
  detailTitle?: string;
  /** Back label for the compact NavStack (default "Back"). */
  backLabel?: string;
  /** Compact NavStack configuration and per-view toolbars. */
  compactStack?: SplitViewCompactStack;
  /** A resizable separator on roomy classes (min/max px). Omit for a fixed split. */
  resizable?: SplitViewResizable;
  /**
   * The fixed split's list column width (default 320px). A number is CSS
   * pixels; `{ size, maxFraction }` caps it at that share of the SplitView's
   * width. A resizable split sizes its list with `resizable` instead.
   */
  listWidth?: SplitViewListWidth;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A list-detail split. On roomy classes it shows both panes side
 * by side with an optional resizable separator; on compact classes it collapses
 * to a `NavStack` (list → detail). See `docs/23-app-layouts.md` §3.2. Compose the
 * resizable wiring with `wireResizableRegions` and the compact back with
 * `wireNavStack`.
 */
export function SplitView({
  id,
  label,
  list,
  detail,
  compact = false,
  detailActive = false,
  listTitle = '',
  detailTitle = '',
  backLabel = 'Back',
  compactStack = {},
  resizable,
  listWidth,
  className = '',
  slot,
}: SplitViewProps) {
  if (listWidth !== undefined && resizable)
    throw new RangeError(
      'SplitView listWidth applies to a fixed split; size a resizable list with resizable.size, min, and max',
    );
  const listWidthStyle =
    listWidth === undefined
      ? undefined
      : `--kui-split-view-list-width:${listWidthValue(listWidth)}`;
  if (compact) {
    const listView: NavStackView = {
      ...compactStack.list,
      key: 'list',
      toolbar: { ...compactStack.list?.toolbar, title: listTitle },
      content: list,
    };
    const views: NavStackView[] = detailActive
      ? [
          listView,
          {
            ...compactStack.detail,
            key: 'detail',
            toolbar: { ...compactStack.detail?.toolbar, title: detailTitle },
            content: detail,
          },
        ]
      : [listView];
    return (
      <div
        class={`kui-split-view kui-split-view--compact ${className}`.trim()}
        id={id}
        data-component="split-view"
        data-split-mode="compact"
        slot={slot}
      >
        <NavStack
          id={`${id}-stack`}
          label={label}
          views={views}
          backLabel={backLabel}
          backIcon={compactStack.backIcon}
          backText={compactStack.backText}
          toolbarConfig={compactStack.toolbarConfig}
          hideToolbar={compactStack.hideToolbar}
          bottomToolbar={compactStack.bottomToolbar}
          chromeDividers={compactStack.chromeDividers}
          chromePresentation={compactStack.chromePresentation}
          bottomToolbarPresentation={compactStack.bottomToolbarPresentation}
        />
      </div>
    );
  }
  const listPane = resizable ? (
    <ResizableRegion
      id={`${id}-list`}
      label={listTitle || 'List'}
      size={resizable.size}
      min={resizable.min}
      max={resizable.max}
      separator={resizable.separator}
      handleIcon={resizable.handleIcon}
      contentOverflow={resizable.contentOverflow}
      collapsed={resizable.collapsed}
      transitioning={resizable.transitioning}
      collapseMotion={resizable.collapseMotion}
      restoreControl={resizable.restoreControl}
      restorePosition={resizable.restorePosition}
    >
      <div
        class="kui-split-view__list kui-pane"
        data-split-list
        data-resizable="true"
      >
        {list}
      </div>
    </ResizableRegion>
  ) : (
    <div
      class="kui-split-view__list kui-pane"
      data-split-list
      data-resizable="false"
    >
      {list}
    </div>
  );
  return (
    <div
      class={`kui-split-view ${className}`.trim()}
      id={id}
      data-component="split-view"
      data-split-mode="split"
      aria-label={label}
      style={listWidthStyle}
      slot={slot}
    >
      {listPane}
      <div
        class="kui-split-view__detail kui-pane"
        data-split-detail
        aria-label={detailTitle || undefined}
      >
        {detail}
      </div>
    </div>
  );
}

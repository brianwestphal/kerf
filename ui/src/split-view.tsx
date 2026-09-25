import { NavStack } from './nav-stack.js';
import { ResizableRegion } from './resizable-region.js';
import type { KerfUiContent } from './semantic-content.js';

export interface SplitViewResizable {
  size: number;
  min: number;
  max: number;
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
  /** A resizable separator on roomy classes (min/max px). Omit for a fixed split. */
  resizable?: SplitViewResizable;
  className?: string;
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
  resizable,
  className = '',
}: SplitViewProps) {
  if (compact) {
    const views = detailActive
      ? [
          { key: 'list', title: listTitle, content: list },
          { key: 'detail', title: detailTitle, content: detail },
        ]
      : [{ key: 'list', title: listTitle, content: list }];
    return (
      <div
        class={`kui-split-view kui-split-view--compact ${className}`.trim()}
        id={id}
        data-component="split-view"
        data-split-mode="compact"
      >
        <NavStack
          id={`${id}-stack`}
          label={label}
          views={views}
          backLabel={backLabel}
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

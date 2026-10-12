import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterRootAttributes,
  type StructuralRootAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../shared/styles/css-values.js';

/** `scroll` keeps equal min-width columns; `paged` shows one near-full-width column per page. */
export type ColumnTrackLayout = 'scroll' | 'paged';

const columnTrackProtected = new Set(['data-component', 'data-layout']);

type ColumnTrackRootAttributes = StructuralRootAttributes &
  Readonly<{ 'data-component'?: never; 'data-layout'?: never }>;

export interface ColumnTrackProps {
  /** The columns, in order; each owns its own inset and scrolling. */
  children: KerfUiContent;
  /**
   * `scroll` (default): equal columns that never shrink below
   * `minColumnWidth`, so a narrow track scrolls sideways instead of crushing
   * them. `paged`: each column is nearly the visible width, the next one peeks
   * in, and scrolling snaps to column starts.
   */
  layout?: ColumnTrackLayout;
  /** Narrowest a `scroll` column gets before the track scrolls; default 250px. */
  minColumnWidth?: CssLength;
  /** How much of the next column a `paged` track shows; default 24px. */
  peek?: CssLength;
  id?: string;
  className?: string;
  /** Safe `data-*`, `aria-*`, and structural `role` metadata on the scroller. */
  rootAttributes?: ColumnTrackRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A horizontal track of columns (a kanban board): the track is the sideways
 * scroll owner and fills its parent's height; columns sit flush and own their
 * insets and vertical scrolling. Kerf owns the overflow, the paged snapping,
 * and reduced motion.
 */
export function ColumnTrack({
  children,
  layout = 'scroll',
  minColumnWidth,
  peek,
  id,
  className = '',
  rootAttributes = {},
  slot,
}: ColumnTrackProps) {
  const style = [
    minColumnWidth === undefined
      ? ''
      : `--_kui-column-track-min-width:${minColumnWidth}`,
    peek === undefined ? '' : `--_kui-column-track-peek:${peek}`,
  ]
    .filter(Boolean)
    .join(';');
  return (
    <div
      {...filterRootAttributes(rootAttributes, columnTrackProtected)}
      id={id}
      class={`kui-column-track ${className}`.trim()}
      data-component="column-track"
      data-layout={layout}
      style={style || undefined}
      slot={slot}
    >
      <div class="kui-column-track__columns">{children}</div>
    </div>
  );
}

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterRootAttributes,
  type StructuralRootAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../shared/styles/css-values.js';

/** `scroll` keeps equal min-width columns; `paged` shows one near-full-width column per page. */
export type ColumnTrackLayout = 'scroll' | 'paged';

const columnTrackProtected = new Set([
  'data-component',
  'data-layout',
  'data-inset',
]);
/** Attributes a named track owns as a region. */
const columnTrackRegionAttributes = ['role', 'aria-label'];

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
  /** Inline edge clearance: default uses the layout margin; none clips columns at the track edges. */
  inset?: 'default' | 'none';
  /** Narrowest a `scroll` column gets before the track scrolls; default 250px. */
  minColumnWidth?: CssLength;
  /** How much of the next column a `paged` track shows; default 24px. */
  peek?: CssLength;
  /**
   * Name the track (a board) for assistive technology: the scroller becomes
   * a `role="region"` landmark with this `aria-label`. Name each column with
   * `List landmark="region"` and its own `ariaLabel`.
   */
  ariaLabel?: string;
  id?: string;
  className?: string;
  /**
   * Safe `data-*`, `aria-*`, and structural `role` metadata on the scroller;
   * with `ariaLabel` the track owns its role and name.
   */
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
  inset = 'default',
  minColumnWidth,
  peek,
  ariaLabel,
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
      {...filterRootAttributes(
        rootAttributes,
        ariaLabel
          ? new Set([...columnTrackProtected, ...columnTrackRegionAttributes])
          : columnTrackProtected,
      )}
      {...(ariaLabel ? { role: 'region', 'aria-label': ariaLabel } : {})}
      id={id}
      class={`kui-column-track ${className}`.trim()}
      data-component="column-track"
      data-layout={layout}
      data-inset={inset === 'none' ? 'none' : undefined}
      style={style || undefined}
      slot={slot}
    >
      <div class="kui-column-track__columns">{children}</div>
    </div>
  );
}

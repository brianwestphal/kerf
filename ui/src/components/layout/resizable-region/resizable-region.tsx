import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import type { CssLength } from '../../../shared/styles/css-values.js';
import { ResizeGrip } from './internal/resize-grip.js';

export type ResizableRegionAxis = 'horizontal' | 'vertical';
export type ResizableRegionEdge = 'start' | 'end';
export type ResizableRegionSeparator = 'auto' | 'hidden';
export type ResizableRegionCollapseMotion = 'none' | 'slide' | 'fade-slide';
export type ResizableRegionContentOverflow = 'clip' | 'auto' | 'visible';
export type ResizableRegionPresentation = 'inline' | 'overlay' | 'hidden';
export type ResizableRegionRestorePosition =
  'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
export type ResizableRegionResponsiveFillAt = 'compact' | 'narrow';

export interface ResizableRegionProps {
  id: string;
  label: string;
  size: number;
  min: number;
  max: number;
  axis?: ResizableRegionAxis;
  edge?: ResizableRegionEdge;
  /** Snap the track to zero. The region renders `inert` and `aria-hidden`
   * while collapsed, so neither Tab nor assistive technology reaches it or
   * lands on an empty landmark; `restoreControl` renders outside the region. */
  collapsed?: boolean;
  transitioning?: boolean;
  /** Whether the separator line is painted. The resize hit target remains available. */
  separator?: ResizableRegionSeparator;
  /** Keep the track change instant while optionally sliding the fixed-size content. */
  collapseMotion?: ResizableRegionCollapseMotion;
  /** Use `visible` while an anchored popup must escape the content box; it raises the region to the popup layer. */
  contentOverflow?: ResizableRegionContentOverflow;
  /** Inline layout, an edge overlay, or a responsive replacement that removes the region. */
  presentation?: ResizableRegionPresentation;
  /** Always-available control rendered while collapsed, outside the clipped region. */
  restoreControl?: SafeHtml;
  /** Safe-area-aware corner of the region's container (not the viewport) for `restoreControl`. */
  restorePosition?: ResizableRegionRestorePosition;
  /** Position a restore control in its container corner or leave it in normal flow. */
  restorePlacement?: 'corner' | 'inline';
  /** Corner distance before the container's safe-area inset. */
  restoreInset?: CssLength;
  /** Fill the available inline track and hide the separator below a container breakpoint. */
  responsiveFillAt?: ResizableRegionResponsiveFillAt;
  /** Decorative dormant content for the separator handle. Must not contain interactive descendants. */
  handleIcon?: SafeHtml;
  children: KerfUiContent;
}

export const clampRegionSize = (size: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(size)));
export const resizeRegionFromPointer = (
  startSize: number,
  delta: number,
  edge: ResizableRegionEdge,
) => startSize + delta * (edge === 'start' ? -1 : 1);

export function ResizableRegion({
  id,
  label,
  size,
  min,
  max,
  axis = 'horizontal',
  edge = 'end',
  collapsed = false,
  transitioning = false,
  separator = 'auto',
  collapseMotion = 'slide',
  contentOverflow = 'clip',
  presentation = 'inline',
  restoreControl,
  restorePosition = axis === 'horizontal' && edge === 'end'
    ? 'bottom-start'
    : 'bottom-end',
  restorePlacement = 'corner',
  restoreInset,
  responsiveFillAt,
  handleIcon,
  children,
}: ResizableRegionProps) {
  const expandedSize = clampRegionSize(size, min, max);
  const resolved = collapsed ? 0 : expandedSize;
  const orientation = axis === 'horizontal' ? 'vertical' : 'horizontal';
  return (
    <>
      <section
        class="kui-resizable-region"
        data-component="resizable-region"
        data-region-id={id}
        data-axis={axis}
        data-edge={edge}
        data-collapsed={String(collapsed)}
        data-transitioning={String(transitioning)}
        data-separator={separator}
        data-collapse-motion={collapseMotion}
        data-content-overflow={contentOverflow}
        data-presentation={presentation}
        data-responsive-fill-at={responsiveFillAt}
        style={`--kui-resizable-region-size:${resolved}px;--kui-resizable-region-expanded-size:${expandedSize}px`}
        aria-label={label}
        // Collapsed, the labeled region leaves the accessibility tree whole
        // (its content is inert and its separator already hidden), so no
        // empty landmark stays behind; the restore control is a sibling.
        aria-hidden={
          collapsed || presentation === 'hidden' ? 'true' : undefined
        }
        inert={collapsed}
      >
        <div class="kui-resizable-region__content" inert={collapsed}>
          {children}
        </div>
        <div
          class="kui-resizable-region__handle"
          role="separator"
          tabindex={collapsed || presentation !== 'inline' ? '-1' : '0'}
          aria-label={`Resize ${label}`}
          aria-orientation={orientation}
          aria-valuemin={collapsed ? 0 : min}
          aria-valuemax={max}
          aria-valuenow={resolved}
          aria-hidden={
            collapsed || presentation !== 'inline' ? 'true' : undefined
          }
          data-kui-resize-handle
          data-region-id={id}
        >
          <span class="kui-resizable-region__handle-icon" aria-hidden="true">
            {handleIcon ?? <ResizeGrip axis={axis} />}
          </span>
        </div>
      </section>
      {collapsed && restoreControl && presentation !== 'hidden' && (
        <div
          class="kui-resizable-region__restore"
          data-region-restore={id}
          data-position={restorePosition}
          data-placement={restorePlacement}
          style={
            restoreInset
              ? `--kui-resizable-region-restore-inset:${restoreInset}`
              : undefined
          }
        >
          {restoreControl}
        </div>
      )}
    </>
  );
}

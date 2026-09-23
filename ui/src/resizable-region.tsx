import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from './semantic-content.js';

export type ResizableRegionAxis = 'horizontal' | 'vertical';
export type ResizableRegionEdge = 'start' | 'end';
export type ResizableRegionSeparator = 'auto' | 'hidden';
export type ResizableRegionCollapseMotion = 'none' | 'slide' | 'fade-slide';
export type ResizableRegionContentOverflow = 'clip' | 'auto' | 'visible';
export type ResizableRegionPresentation = 'inline' | 'overlay' | 'hidden';
export type ResizableRegionRestorePosition = 'bottom-start' | 'bottom-end';

export interface ResizableRegionProps {
  id: string;
  label: string;
  size: number;
  min: number;
  max: number;
  axis?: ResizableRegionAxis;
  edge?: ResizableRegionEdge;
  collapsed?: boolean;
  transitioning?: boolean;
  /** Whether the separator line is painted. The resize hit target remains available. */
  separator?: ResizableRegionSeparator;
  /** Keep the track change instant while optionally sliding the fixed-size content. */
  collapseMotion?: ResizableRegionCollapseMotion;
  /** Overflow policy for content such as an open popup inside a bottom drawer. */
  contentOverflow?: ResizableRegionContentOverflow;
  /** Inline layout, an edge overlay, or a responsive replacement that removes the region. */
  presentation?: ResizableRegionPresentation;
  /** Always-available control rendered while collapsed, outside the clipped region. */
  restoreControl?: SafeHtml;
  /** Safe-area-aware viewport corner for `restoreControl`. */
  restorePosition?: ResizableRegionRestorePosition;
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

function ResizeGrip({ axis }: { axis: ResizableRegionAxis }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    >
      {axis === 'horizontal' ? (
        <>
          <path d="M9 6v12"></path>
          <path d="M15 6v12"></path>
        </>
      ) : (
        <>
          <path d="M6 9h12"></path>
          <path d="M6 15h12"></path>
        </>
      )}
    </svg>
  );
}

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
        style={`--kui-resizable-region-size:${resolved}px;--kui-resizable-region-expanded-size:${expandedSize}px`}
        aria-label={label}
        aria-hidden={presentation === 'hidden' ? 'true' : undefined}
      >
        <div class="kui-resizable-region__content">{children}</div>
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
        >
          {restoreControl}
        </div>
      )}
    </>
  );
}

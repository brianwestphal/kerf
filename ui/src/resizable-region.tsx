import type { SafeHtml } from 'kerfjs';

export type ResizableRegionAxis = 'horizontal' | 'vertical';
export type ResizableRegionEdge = 'start' | 'end';

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
  children: SafeHtml | SafeHtml[];
}

export const clampRegionSize = (size: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(size)));
export const resizeRegionFromPointer = (startSize: number, delta: number, edge: ResizableRegionEdge) => startSize + delta * (edge === 'start' ? -1 : 1);

function ResizeGrip({ axis }: { axis: ResizableRegionAxis }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    {axis === 'horizontal'
      ? <><path d="M9 6v12"></path><path d="M15 6v12"></path></>
      : <><path d="M6 9h12"></path><path d="M6 15h12"></path></>}
  </svg>;
}

export function ResizableRegion({ id, label, size, min, max, axis = 'horizontal', edge = 'end', collapsed = false, transitioning = false, children }: ResizableRegionProps) {
  const expandedSize = clampRegionSize(size, min, max);
  const resolved = collapsed ? 0 : expandedSize;
  const orientation = axis === 'horizontal' ? 'vertical' : 'horizontal';
  return <section class="kui-resizable-region" data-component="resizable-region" data-region-id={id} data-axis={axis} data-edge={edge} data-collapsed={String(collapsed)} data-transitioning={String(transitioning)} style={`--kui-resizable-region-size:${resolved}px;--kui-resizable-region-expanded-size:${expandedSize}px`} aria-label={label}>
    <div class="kui-resizable-region__content">{children}</div>
    <div class="kui-resizable-region__handle" role="separator" tabindex="0" aria-label={`Resize ${label}`} aria-orientation={orientation} aria-valuemin={collapsed ? 0 : min} aria-valuemax={max} aria-valuenow={resolved} data-kui-resize-handle data-region-id={id}>
      <ResizeGrip axis={axis} />
    </div>
  </section>;
}

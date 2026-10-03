import type { ResizableRegionAxis } from './resizable-region.js';

/**
 * The dormant two-line grip a resize separator shows on hover and focus. Shared
 * by `ResizableRegion` and resizable `Workbench` panels so both separators read
 * the same. Internal.
 */
export function ResizeGrip({ axis }: { axis: ResizableRegionAxis }) {
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
          <path d="M9 6v12" />
          <path d="M15 6v12" />
        </>
      ) : (
        <>
          <path d="M6 9h12" />
          <path d="M6 15h12" />
        </>
      )}
    </svg>
  );
}

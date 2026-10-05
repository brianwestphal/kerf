import {
  type ResizeCommit,
  type WireResizableRegionsOptions,
  wireResizeHandles,
} from '../internal/resize-wiring.js';

export type { ResizeCommit, WireResizableRegionsOptions };

/** Wire pointer and separator-keyboard behavior for every ResizableRegion below root. */
export function wireResizableRegions(
  root: HTMLElement,
  options: WireResizableRegionsOptions,
) {
  return wireResizeHandles(
    root,
    options,
    '[data-component="resizable-region"]',
  );
}

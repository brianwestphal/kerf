import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { GripVertical } from 'lucide';

import { icon, regionSize } from './state.js';

export function ResizeDemo() {
  return (
    <div
      class="demo-resize-shell"
      data-demo="resize"
      data-catalog-geometry-overlay-skip
    >
      <ResizableRegion
        id="catalog-panel"
        label="Catalog panel"
        size={regionSize.value}
        min={180}
        max={420}
        handleIcon={icon(GripVertical, 'custom-resize-handle')}
      >
        <div class="demo-resize-panel kui-pane">
          <div class="demo-resize-panel__copy kui-content-item">
            <strong>Resizable panel</strong>
            <span>
              Use the handle with a pointer, arrow keys, Home, or End.
            </span>
          </div>
        </div>
      </ResizableRegion>
    </div>
  );
}

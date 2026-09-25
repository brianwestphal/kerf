import '@kerfjs/ui/lucide-icon.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { GripVertical } from 'lucide';

import { DemoContentItem } from './demo-content-item.js';
import { regionSize } from './state.js';

export function ResizeDemo() {
  return (
    <CatalogExampleStack
      label="Resizable region"
      rootAttributes={{ 'data-demo': 'resize' }}
    >
      <CatalogExample
        label="Horizontal resize"
        note="Use the handle with a pointer, arrow keys, Home, or End."
        viewport={{
          layout: 'flex',
          width: 'wide',
          height: 'fill',
          minHeight: 'medium',
          frame: 'solid',
          surface: 'lowered',
          overflow: 'auto-x',
          shadow: true,
          fillChildren: true,
        }}
        rootAttributes={{ 'data-catalog-geometry-overlay-skip': '' }}
      >
        <ResizableRegion
          id="catalog-panel"
          label="Catalog panel"
          size={regionSize.value}
          min={180}
          max={420}
          handleIcon={
            <LucideIcon icon={GripVertical} name="custom-resize-handle" />
          }
        >
          <Pane rootAttributes={{ 'data-catalog-viewport-fill': '' }}>
            <DemoContentItem
              title="Resizable panel"
              detail="Use the handle with a pointer, arrow keys, Home, or End."
            />
          </Pane>
        </ResizableRegion>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

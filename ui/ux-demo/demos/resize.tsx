import '@kerfjs/ui/lucide-icon.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { GripVertical, PanelLeftOpen } from 'lucide';

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
          height: 'medium',
          frame: 'solid',
          surface: 'lowered',
          overflow: 'auto-x',
          shadow: true,
        }}
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
          <Pane>
            <DemoContentItem
              title="Catalog panel"
              // Word joiners and a no-break space keep the width range on one line.
              detail={
                'Navigation or inspector content, 180\u2060\u2013\u2060420\u00a0px wide.'
              }
            />
          </Pane>
        </ResizableRegion>
      </CatalogExample>
      <CatalogExample
        label="Popup from a clipped drawer"
        note="Opening a menu releases the drawer's clipping and raises its popup layer without changing contentOverflow or rerendering the region."
        viewport={{
          layout: 'flex',
          width: 'wide',
          height: 'medium',
          frame: 'solid',
        }}
      >
        <ResizableRegion
          id="catalog-menu-drawer"
          label="Menu drawer"
          axis="vertical"
          edge="start"
          size={120}
          min={120}
          max={240}
        >
          <div class="kui-content">
            <PopupMenu
              text="Create item"
              placement="top-start"
              items={[
                { label: 'New terminal', action: 'create-terminal' },
                { label: 'New task', action: 'create-task' },
              ]}
            />
          </div>
        </ResizableRegion>
      </CatalogExample>
      <CatalogExample
        label="Collapsed region restore"
        note="The region places its restore control in a safe-area-aware top corner."
        viewport={{
          layout: 'flex',
          width: 'text',
          height: 'medium',
          frame: 'solid',
        }}
        rootAttributes={{ 'data-demo-region-restore': '' }}
      >
        <ResizableRegion
          id="catalog-collapsed-panel"
          label="Collapsed panel"
          size={240}
          min={180}
          max={420}
          collapsed
          restorePosition="top-end"
          restoreControl={
            <FloatingToolbar label="Restore collapsed panel" placement="inline">
              <ToolbarControlGroup label="Restore panel" single>
                <button type="button" aria-label="Restore panel">
                  <LucideIcon icon={PanelLeftOpen} name="panel-left-open" />
                </button>
              </ToolbarControlGroup>
            </FloatingToolbar>
          }
        >
          <Pane />
        </ResizableRegion>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

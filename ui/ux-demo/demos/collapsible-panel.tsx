import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/floating-toolbar.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '@kerfjs/ui/collapsible-panel';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';

import { DemoContentItem } from './demo-content-item.js';

const content = (title: string, detail: string) => (
  <div class="kui-content">
    <DemoContentItem title={title} detail={detail} />
  </div>
);

/** The restore example's drawer id, which `wireSidebar` targets. */
export const RESTORE_DRAWER_ID = 'catalog-panel-restore';
/** The `data-action` both of the restore example's toggles carry. */
export const RESTORE_DRAWER_ACTION = 'toggle-catalog-panel-restore';
/** The restore example's app-owned collapsed flag; `wireSidebar` writes it. */
export const restoreDrawerCollapsed = signal(true);

/** Start each visit with the drawer collapsed, so its restore control shows. */
export function resetCollapsiblePanelDemo(): void {
  restoreDrawerCollapsed.value = true;
}

const consoleToggle = (collapsed: boolean) => (
  <CollapsiblePanelToggle
    side="bottom"
    collapsed={collapsed}
    action={RESTORE_DRAWER_ACTION}
    panelId={RESTORE_DRAWER_ID}
    label={collapsed ? 'Show console' : 'Hide console'}
  />
);

export function CollapsiblePanelDemo() {
  return (
    <CatalogExampleStack
      label="Collapsible panel dock positions"
      rootAttributes={{ 'data-demo': 'collapsible-panel' }}
    >
      <CatalogExample
        label="Left rail"
        note="The panel owns its width and trailing separator; its child owns internal content geometry."
        viewport={{ layout: 'grid', width: 'full', height: 'short' }}
      >
        <CollapsiblePanel
          id="catalog-panel-left"
          side="left"
          size={280}
          label="Project navigator"
        >
          {content(
            'Navigator',
            'Collapse from panel chrome; restore from adjacent chrome.',
          )}
        </CollapsiblePanel>
      </CatalogExample>
      <CatalogExample
        label="Right rail"
        note="Right-side panels use the mirrored separator and slide direction."
        viewport={{ layout: 'grid', width: 'full', height: 'short' }}
      >
        <CollapsiblePanel
          id="catalog-panel-right"
          side="right"
          size={280}
          label="Selection inspector"
        >
          {content(
            'Inspector',
            'The application owns size and collapsed state.',
          )}
        </CollapsiblePanel>
      </CatalogExample>
      <CatalogExample
        label="Bottom drawer"
        note="A drawer owns its top separator and controlled height."
      >
        <CollapsiblePanel
          id="catalog-panel-bottom"
          side="bottom"
          size={180}
          label="Build output"
        >
          {content(
            'Build output',
            'Use Workbench when several panels form one shell.',
          )}
        </CollapsiblePanel>
      </CatalogExample>
      <CatalogExample
        label="Restore control"
        note="While collapsed, the drawer's restoreControl floats in a corner of its container; wireSidebar owns both toggles and hands focus between them."
        viewport={{
          layout: 'flex-column',
          width: 'full',
          height: 'reduced',
          frame: 'solid',
          surface: 'default',
          overflow: 'hidden',
        }}
        rootAttributes={{ 'data-catalog-panel-restore-example': '' }}
      >
        <Pane
          header={
            <Toolbar
              label="Editor"
              leading={<ToolbarText text="Editor" size="xlarge" />}
            />
          }
        >
          {content(
            'The app owns the collapsed flag',
            'Hide the console from its own toolbar; restore it from the corner control.',
          )}
        </Pane>
        <CollapsiblePanel
          id={RESTORE_DRAWER_ID}
          side="bottom"
          size={140}
          label="Console"
          collapsed={restoreDrawerCollapsed.value}
          restoreControl={
            <FloatingToolbar label="Console">
              <ToolbarControlGroup label="Console" single>
                {consoleToggle(true)}
              </ToolbarControlGroup>
            </FloatingToolbar>
          }
        >
          <Pane
            header={
              <Toolbar
                label="Console"
                leading={<ToolbarText text="Console" />}
                trailing={
                  <ToolbarControlGroup
                    label="Console"
                    appearance="borderless"
                    single
                  >
                    {consoleToggle(false)}
                  </ToolbarControlGroup>
                }
              />
            }
          >
            {content(
              'Build finished',
              'The drawer stays mounted while it is collapsed.',
            )}
          </Pane>
        </CollapsiblePanel>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

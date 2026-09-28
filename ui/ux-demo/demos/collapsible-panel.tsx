import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/floating-toolbar.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import {
  CollapsiblePanel,
  CollapsiblePanelRelocated,
  type CollapsiblePanelToolbar,
} from '@kerfjs/ui/collapsible-panel';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';
import { FilePlus, Search } from 'lucide';

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

/** The relocation example's rail id and toggle action, which `wireSidebar` targets. */
export const RELOCATION_RAIL_ID = 'catalog-panel-relocation';
export const RELOCATION_RAIL_ACTION = 'toggle-catalog-panel-relocation';
/** The relocation example's app-owned collapsed flag. */
export const relocationRailCollapsed = signal(true);

/** Start each visit with both examples collapsed, so the relocated controls show. */
export function resetCollapsiblePanelDemo(): void {
  restoreDrawerCollapsed.value = true;
  relocationRailCollapsed.value = true;
}

/** A borderless single-button group with an icon action. */
function iconGroup(label: string, icon: typeof Search, name: string) {
  return (
    <ToolbarControlGroup label={label} appearance="borderless" single>
      <button
        type="button"
        aria-label={label}
        data-action="collapsible-panel-demo-command"
      >
        <LucideIcon icon={icon} name={name} />
      </button>
    </ToolbarControlGroup>
  );
}

const consoleToolbar: CollapsiblePanelToolbar = {
  label: 'Console',
  title: <ToolbarText text="Console" />,
  toggle: { action: RESTORE_DRAWER_ACTION, name: 'console' },
};

const navigatorToolbar: CollapsiblePanelToolbar = {
  label: 'Navigator',
  panelOnly: iconGroup('New file', FilePlus, 'file-plus'),
  constant: iconGroup('Search files', Search, 'search'),
  toggle: { action: RELOCATION_RAIL_ACTION, name: 'navigator' },
};

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
        label="Toolbar relocation"
        note="The rail composes its toolbar: panel-only groups lead, constant groups and the standard toggle trail. While it is collapsed, CollapsiblePanelRelocated puts the constant groups and toggle at the start of the editor toolbar."
        viewport={{
          layout: 'grid',
          width: 'full',
          height: 'reduced',
          frame: 'solid',
          surface: 'default',
          overflow: 'hidden',
        }}
        rootAttributes={{ 'data-catalog-panel-relocation-example': '' }}
      >
        <Row fill gap="none">
          <CollapsiblePanel
            id={RELOCATION_RAIL_ID}
            side="left"
            size={220}
            label="Navigator"
            collapsed={relocationRailCollapsed.value}
            toolbar={navigatorToolbar}
          >
            {content('Files', 'Panel-only New file waits here while closed.')}
          </CollapsiblePanel>
          <List flex>
            <Pane
              header={
                <Toolbar
                  label="Editor"
                  leading={
                    <>
                      <CollapsiblePanelRelocated
                        panelId={RELOCATION_RAIL_ID}
                        side="left"
                        collapsed={relocationRailCollapsed.value}
                        toolbar={navigatorToolbar}
                      />
                      <ToolbarText text="Editor" size="xlarge" />
                    </>
                  }
                />
              }
            >
              {content(
                'The app owns the collapsed flag',
                'Show the navigator from the editor toolbar; hide it from its own toolbar.',
              )}
            </Pane>
          </List>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Restore control"
        note="With no bottom toolbar to hold it, a collapsed drawer's toggle floats in a corner of its container; wireSidebar hands focus between the two toggles."
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
          toolbar={consoleToolbar}
          restoreControl={
            <FloatingToolbar label="Console">
              <CollapsiblePanelRelocated
                panelId={RESTORE_DRAWER_ID}
                side="bottom"
                collapsed={restoreDrawerCollapsed.value}
                toolbar={consoleToolbar}
              />
            </FloatingToolbar>
          }
        >
          {content(
            'Build finished',
            'The drawer stays mounted while it is collapsed.',
          )}
        </CollapsiblePanel>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

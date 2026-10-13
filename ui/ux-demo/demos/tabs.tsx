import { AppTab } from '@kerfjs/ui/app-tab';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { CircleDot, PanelLeft, X } from 'lucide';

const extensionAttributes = {
  'data-demo-tab-source': 'workspace',
  'data-Action': 'unsafe-root-action',
  'data-Tab-Id': 'unsafe-tab-id',
  'data-Tab-Dragging': 'true',
  'data-Tab-Drop-Position': 'before',
  role: 'menuitem',
};

export function TabsDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'tabs' }}>
      <CatalogExample label="Selected and Closable" align="none">
        <TabBar id="app-tab-selected" label="Selected AppTab Specimen">
          <AppTab
            id="guidelines"
            name="Guidelines"
            selected
            leading={<LucideIcon icon={PanelLeft} name="panel-left" />}
            closeIcon={<LucideIcon icon={X} name="custom-tab-close" />}
            rootAttributes={extensionAttributes}
          />
        </TabBar>
      </CatalogExample>
      <CatalogExample label="Compact and Segmented" align="none">
        <TabBar
          id="app-tab-compact"
          label="Compact AppTab Specimen"
          presentation="segmented"
        >
          <AppTab
            id="activity"
            name="Activity"
            selected
            closable={false}
            presentation="segmented"
            size="compact"
          />
          <AppTab
            id="status"
            name="Status"
            closable={false}
            leading={<LucideIcon icon={CircleDot} name="circle-dot" />}
            presentation="icon-only"
            size="compact"
          />
        </TabBar>
      </CatalogExample>
      <CatalogExample label="Truncated Label" align="none">
        <TabBar id="app-tab-truncated" label="Truncated AppTab Specimen">
          <AppTab
            id="long-label"
            name="A Deliberately Long Document Name"
            selected
            closable={false}
            labelMaxWidth={120}
          />
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Drop Target and Visible Name"
        note="The drop-target state paints a brand ring. A visible name expands instead of clipping an inline loading treatment."
        align="none"
      >
        <TabBar id="app-tab-drop-target" label="Drop-Target AppTab Specimen">
          <AppTab
            id="project-grid"
            name="Project Grid"
            selected
            closable={false}
          />
          <AppTab
            id="accounting"
            name="Accounting Project"
            closable={false}
            dropTarget
            labelMaxWidth={80}
            nameOverflow="visible"
          />
        </TabBar>
      </CatalogExample>
      <CatalogExample label="Placeholder" align="none">
        <TabBar id="app-tab-placeholder" label="Loading AppTab Specimen">
          <AppTab id="loading" name="" placeholder />
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Pending"
        note="A known tab that is still opening keeps its quiet name and a trailing spinner. It stays selectable so its panel can show placeholders, and has the live tab's geometry, so it swaps in place."
        align="none"
      >
        <TabBar id="app-tab-pending" label="Pending AppTab Specimen">
          <AppTab id="hot-sheet" name="hot-sheet" selected />
          <AppTab
            id="alpha"
            name="alpha"
            pending
            trailing={<LoadingSpinner />}
          />
          <AppTab id="beta" name="beta" />
        </TabBar>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

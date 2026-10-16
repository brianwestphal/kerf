import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { TabBarItem } from '@kerfjs/ui/tab-bar-item';
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
        <TabBar id="tab-bar-item-selected" label="Selected TabBarItem Specimen">
          <TabBarItem
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
          id="tab-bar-item-compact"
          label="Compact TabBarItem Specimen"
          presentation="segmented"
        >
          <TabBarItem
            id="activity"
            name="Activity"
            selected
            closable={false}
            presentation="segmented"
            size="compact"
          />
          <TabBarItem
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
        <TabBar
          id="tab-bar-item-truncated"
          label="Truncated TabBarItem Specimen"
        >
          <TabBarItem
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
        <TabBar
          id="tab-bar-item-drop-target"
          label="Drop-Target TabBarItem Specimen"
        >
          <TabBarItem
            id="project-grid"
            name="Project Grid"
            selected
            closable={false}
          />
          <TabBarItem
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
        <TabBar
          id="tab-bar-item-placeholder"
          label="Loading TabBarItem Specimen"
        >
          <TabBarItem id="loading" name="" placeholder />
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Pending"
        note="A known tab that is still opening keeps its quiet name and a trailing spinner. It stays selectable so its panel can show placeholders, and has the live tab's geometry, so it swaps in place."
        align="none"
      >
        <TabBar id="tab-bar-item-pending" label="Pending TabBarItem Specimen">
          <TabBarItem id="hot-sheet" name="hot-sheet" selected />
          <TabBarItem
            id="alpha"
            name="alpha"
            pending
            trailing={<LoadingSpinner />}
          />
          <TabBarItem id="beta" name="beta" />
        </TabBar>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

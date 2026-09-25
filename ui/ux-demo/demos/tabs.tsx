import { AppTab } from '@kerfjs/ui/app-tab';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
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
      <CatalogExample label="Selected and closable" align="none">
        <TabBar id="app-tab-selected" label="Selected AppTab specimen">
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
      <CatalogExample label="Compact and segmented" align="none">
        <TabBar
          id="app-tab-compact"
          label="Compact AppTab specimen"
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
      <CatalogExample label="Truncated label" align="none">
        <TabBar id="app-tab-truncated" label="Truncated AppTab specimen">
          <AppTab
            id="long-label"
            name="A deliberately long document name"
            selected
            closable={false}
            labelMaxWidth={120}
          />
        </TabBar>
      </CatalogExample>
      <CatalogExample label="Placeholder" align="none">
        <TabBar id="app-tab-placeholder" label="Loading AppTab specimen">
          <AppTab id="loading" name="" placeholder />
        </TabBar>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

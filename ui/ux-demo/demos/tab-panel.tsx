import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { em } from '@kerfjs/ui/css-values';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { Skeleton } from '@kerfjs/ui/skeleton';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { TabBarItem } from '@kerfjs/ui/tab-bar-item';
import { TabPanel } from '@kerfjs/ui/tab-panel';
import { Text } from '@kerfjs/ui/text';

import { tabPanelActive } from './state.js';

const TAB_PANEL_TABS = [
  { id: 'notes', name: 'Notes', copy: 'Release notes for the next version.' },
  {
    id: 'activity',
    name: 'Activity',
    copy: 'Three reviews and one comment today.',
  },
] as const;

export function TabPanelDemo() {
  return (
    <CatalogExampleStack
      label="TabPanel Variants"
      rootAttributes={{ 'data-demo': 'tab-panel' }}
    >
      <CatalogExample
        label="Selected and Hidden Panels"
        note="Each TabBarItem names its panel with panelId, and each TabPanel is named by its tab through tabId. The application hides every panel but the selected tab's."
        viewport={{ width: 'compact', frame: 'solid' }}
      >
        <TabBar id="tab-panel-demo-tabs" label="Project Sections">
          {TAB_PANEL_TABS.map((tab) => (
            <TabBarItem
              id={tab.id}
              name={tab.name}
              selected={tabPanelActive.value === tab.id}
              closable={false}
              selectAction="select-tab-panel-demo"
              tabId={`tab-panel-demo-${tab.id}-tab`}
              panelId={`tab-panel-demo-${tab.id}`}
            />
          ))}
        </TabBar>
        {TAB_PANEL_TABS.map((tab) => (
          <TabPanel
            id={`tab-panel-demo-${tab.id}`}
            tabId={`tab-panel-demo-${tab.id}-tab`}
            hidden={tabPanelActive.value !== tab.id}
          >
            <Text>{tab.copy}</Text>
          </TabPanel>
        ))}
      </CatalogExample>
      <CatalogExample
        label="Busy Panel"
        note="A pending tab's panel shows placeholders and is marked busy until its content loads."
        viewport={{ width: 'compact', frame: 'solid' }}
      >
        <TabBar id="tab-panel-demo-busy-tabs" label="Opening Report">
          <TabBarItem
            id="report"
            name="Quarterly Report"
            selected
            pending
            trailing={<LoadingSpinner />}
            closable={false}
            tabId="tab-panel-demo-busy-tab"
            panelId="tab-panel-demo-busy"
          />
        </TabBar>
        <TabPanel id="tab-panel-demo-busy" tabId="tab-panel-demo-busy-tab" busy>
          <Text>
            <Skeleton width={em(12)} label="Loading Quarterly Report…" />
          </Text>
        </TabPanel>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

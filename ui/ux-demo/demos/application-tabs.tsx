import '@awesome.me/webawesome/dist/components/card/card.js';

import { AppTab } from '@kerfjs/ui/app-tab';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { Text } from '@kerfjs/ui/text';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { PanelLeft, Plus } from 'lucide';

import { tabBarActive, tabBarTabs } from './state.js';

export function ApplicationTabsDemo() {
  const activeName = tabBarActive.value;
  return (
    <CatalogExampleStack
      label="Application tab composition"
      rootAttributes={{ 'data-demo': 'application-tabs' }}
    >
      <CatalogExample
        label="Reorderable application tabs"
        viewport={{ width: 'medium' }}
      >
        <wa-card
          appearance="outlined"
          with-header
          with-footer
          data-demo-application-tabs-frame
        >
          <TabBar
            slot="header"
            id="catalog-tabs"
            label="Open catalog pages"
            leading={
              <ToolbarControlGroup appearance="borderless" single>
                <button
                  type="button"
                  aria-label="Show navigation"
                  data-action="log-sidebar"
                >
                  <LucideIcon icon={PanelLeft} name="panel-left" />
                </button>
              </ToolbarControlGroup>
            }
            trailing={
              <ToolbarControlGroup appearance="borderless" single>
                <button
                  type="button"
                  aria-label="Add tab"
                  data-action="add-demo-tab"
                >
                  <LucideIcon icon={Plus} name="plus" />
                </button>
              </ToolbarControlGroup>
            }
          >
            {tabBarTabs.value.map((tab) => (
              <AppTab
                id={tab.id}
                name={tab.name}
                selected={tabBarActive.value === tab.id}
                draggable
                selectAction="select-reorder-tab"
                closeAction="close-reorder-tab"
                rootAttributes={{ 'data-demo-tab-id': tab.id }}
              />
            ))}
          </TabBar>
          <Text variant="h3" role="tabpanel" aria-label={activeName}>
            {activeName}
          </Text>
          <Text slot="footer" tone="quiet" size="compact">
            Order:{' '}
            <strong data-tab-order>
              {tabBarTabs.value.map((tab) => tab.name).join(' · ')}
            </strong>
          </Text>
        </wa-card>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

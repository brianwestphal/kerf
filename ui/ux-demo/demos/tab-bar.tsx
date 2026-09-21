import { AppTab } from '@kerfjs/ui/app-tab';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { PanelLeft, Plus } from 'lucide';

import { icon, tabBarActive, tabBarTabs } from './state.js';

export function TabBarDemo() {
  return (
    <CatalogExampleStack
      className="demo-tab-bar-frame"
      rootAttributes={{ 'data-demo': 'tab-bar' }}
    >
      <CatalogExample align="none">
        <div class="demo-example-cluster">
          <TabBar
            id="catalog-tabs"
            label="Open catalog pages"
            leading={
              <ToolbarControlGroup appearance="borderless" single>
                <button
                  type="button"
                  aria-label="Show navigation"
                  data-action="log-sidebar"
                >
                  {icon(PanelLeft, 'panel-left')}
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
                  {icon(Plus, 'plus')}
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
          <p class="demo-example-readout">
            Order:{' '}
            <strong data-tab-order>
              {tabBarTabs.value.map((tab) => tab.name).join(' · ')}
            </strong>
          </p>
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

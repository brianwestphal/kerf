import './application-tabs.css';

import { AppTab } from '@kerfjs/ui/app-tab';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { PanelLeft, Plus } from 'lucide';

import { icon, tabBarActive, tabBarTabs } from './state.js';

export function ApplicationTabsDemo() {
  const activeName = tabBarActive.value;
  return (
    <CatalogExampleStack
      label="Application tab composition"
      rootAttributes={{ 'data-demo': 'application-tabs' }}
    >
      <CatalogExample label="Reorderable application tabs">
        <section class="demo-application-tabs">
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
          <section
            class="demo-application-tabs__panel kui-content-item"
            role="tabpanel"
            aria-label={activeName}
          >
            <strong class="demo-application-tabs__panel-title">
              {activeName}
            </strong>
          </section>
          <p class="demo-application-tabs__readout">
            Order:{' '}
            <strong class="demo-application-tabs__readout-value" data-tab-order>
              {tabBarTabs.value.map((tab) => tab.name).join(' · ')}
            </strong>
          </p>
        </section>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { em } from '@kerfjs/ui/css-values';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Skeleton } from '@kerfjs/ui/skeleton';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { TabBarItem } from '@kerfjs/ui/tab-bar-item';
import { Text } from '@kerfjs/ui/text';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { PanelLeft, Plus } from 'lucide';

import { reportTabActive, tabBarActive, tabBarTabs } from './state.js';

export function ApplicationTabsDemo() {
  const activeName = tabBarActive.value;
  const activeTab = tabBarTabs.value.find((tab) => tab.id === activeName);
  return (
    <CatalogExampleStack
      label="Application Tab Composition"
      rootAttributes={{ 'data-demo': 'application-tabs' }}
    >
      <CatalogExample
        label="Reorderable Application Tabs"
        viewport={{ width: 'medium', frame: 'solid' }}
      >
        <Pane
          rootAttributes={{ 'data-demo-application-tabs-frame': '' }}
          header={
            <TabBar
              id="catalog-tabs"
              label="Open Catalog Pages"
              leading={
                <ToolbarControlGroup appearance="borderless" single>
                  <ToolbarButton
                    ariaLabel="Show Navigation"
                    action="log-sidebar"
                    icon={<LucideIcon icon={PanelLeft} name="panel-left" />}
                  />
                </ToolbarControlGroup>
              }
              trailing={
                <ToolbarControlGroup appearance="borderless" single>
                  <ToolbarButton
                    ariaLabel="Add Tab"
                    action="add-demo-tab"
                    icon={<LucideIcon icon={Plus} name="plus" />}
                  />
                </ToolbarControlGroup>
              }
            >
              {tabBarTabs.value.map((tab) => (
                <TabBarItem
                  id={tab.id}
                  tabId={`catalog-tab-${tab.id}`}
                  panelId="catalog-active-panel"
                  name={tab.name}
                  selected={tabBarActive.value === tab.id}
                  pending={tab.pending}
                  trailing={tab.pending ? <LoadingSpinner /> : undefined}
                  draggable
                  selectAction="select-reorder-tab"
                  closeAction="close-reorder-tab"
                  rootAttributes={{ 'data-demo-tab-id': tab.id }}
                />
              ))}
            </TabBar>
          }
          footer={
            <ListInsetText>
              <Text tone="quiet" size="compact">
                Order:{' '}
                <strong data-tab-order>
                  {tabBarTabs.value.map((tab) => tab.name).join(' · ')}
                </strong>
              </Text>
            </ListInsetText>
          }
        >
          {/* A still-opening tab is selectable; its panel keeps the live
              heading chrome with a placeholder value until loading completes,
              so the swap does not shift the panel. */}
          <ListInsetText>
            <Text
              variant="h3"
              id="catalog-active-panel"
              role="tabpanel"
              aria-labelledby={`catalog-tab-${activeName}`}
              aria-busy={activeTab?.pending ? 'true' : undefined}
            >
              {activeTab?.pending ? (
                <Skeleton width={em(6)} label={`Loading ${activeTab.name}…`} />
              ) : (
                activeName
              )}
            </Text>
          </ListInsetText>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Named Disabled Tab"
        viewport={{ width: 'medium', frame: 'solid' }}
      >
        <TabBar
          id="catalog-disabled-tabs"
          label="Report Tabs"
          activation="manual"
        >
          <TabBarItem
            id="overview"
            name="Overview"
            selected={reportTabActive.value === 'overview'}
            closable={false}
            selectAction="select-report-tab"
            tabId="report-overview-tab"
            panelId="report-overview-panel"
          />
          <TabBarItem
            id="loading"
            name="Preparing Report"
            disabled
            closable={false}
            selectAction="select-report-tab"
            tabId="report-loading-tab"
            panelId="report-loading-panel"
          />
          <TabBarItem
            id="history"
            name="History"
            selected={reportTabActive.value === 'history'}
            closable={false}
            selectAction="select-report-tab"
            tabId="report-history-tab"
            panelId="report-history-panel"
          />
        </TabBar>
        <section
          id="report-overview-panel"
          role="tabpanel"
          aria-labelledby="report-overview-tab"
          hidden={reportTabActive.value !== 'overview'}
        >
          Overview report
        </section>
        <section
          id="report-loading-panel"
          role="tabpanel"
          aria-labelledby="report-loading-tab"
          hidden
        >
          Report unavailable
        </section>
        <section
          id="report-history-panel"
          role="tabpanel"
          aria-labelledby="report-history-tab"
          hidden={reportTabActive.value !== 'history'}
        >
          Report history
        </section>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

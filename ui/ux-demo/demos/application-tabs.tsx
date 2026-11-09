import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';

import { renderApplicationTabItem } from '../views/application-tab-item.view.js';
import { renderApplicationTabsDisabled } from '../views/application-tabs-disabled.view.js';
import { renderApplicationTabsReorderable } from '../views/application-tabs-reorderable.view.js';
import { reportTabActive, tabBarActive, tabBarTabs } from './state.js';

export function ApplicationTabsDemo() {
  const activeName = tabBarActive.value;
  const activeTab = tabBarTabs.value.find((tab) => tab.id === activeName);
  const reportName = reportTabActive.value;

  return (
    <CatalogExampleStack
      label="Application Tab Composition"
      rootAttributes={{ 'data-demo': 'application-tabs' }}
    >
      <CatalogExample
        label="Reorderable Application Tabs"
        viewport={{ width: 'medium', frame: 'solid' }}
      >
        {renderApplicationTabsReorderable(
          {
            activeTabId: `catalog-tab-${activeName}`,
            activeBusy: activeTab?.pending ?? false,
            activeName,
            loadingLabel: `Loading ${activeTab?.name ?? activeName}…`,
            orderLabel: tabBarTabs.value.map((tab) => tab.name).join(' · '),
          },
          {
            tabItems: () => (
              <>
                {tabBarTabs.value.map((tab) =>
                  renderApplicationTabItem(
                    {
                      id: tab.id,
                      tabId: `catalog-tab-${tab.id}`,
                      name: tab.name,
                      selected: activeName === tab.id,
                      pending: tab.pending ?? false,
                    },
                    {},
                    tab.id,
                  ),
                )}
              </>
            ),
          },
          'application-tabs',
        )}
      </CatalogExample>
      <CatalogExample
        label="Named Disabled Tab"
        viewport={{ width: 'medium', frame: 'solid' }}
      >
        {renderApplicationTabsDisabled({
          overviewSelected: reportName === 'overview',
          historySelected: reportName === 'history',
          overviewHidden: reportName !== 'overview',
          historyHidden: reportName !== 'history',
        })}
      </CatalogExample>
    </CatalogExampleStack>
  );
}

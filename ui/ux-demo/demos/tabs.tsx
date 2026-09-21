import { AppTab } from '@kerfjs/ui/app-tab';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { PanelLeft, X } from 'lucide';

import { activeTab, icon } from './state.js';

export function TabsDemo() {
  const extensionAttributes = {
    'data-demo-tab-source': 'workspace',
    'data-Action': 'unsafe-root-action',
    'data-Tab-Id': 'unsafe-tab-id',
    'data-Tab-Dragging': 'true',
    'data-Tab-Drop-Position': 'before',
    role: 'menuitem',
  };
  return (
    <CatalogExampleStack
      className="demo-tabs"
      rootAttributes={{ 'data-demo': 'tabs' }}
    >
      <CatalogExample align="none">
        <TabBar id="focused-app-tabs" label="Open documents">
          {(['library', 'guidelines', 'catalog'] as const).map((id) => (
            <AppTab
              id={id}
              name={id[0]!.toUpperCase() + id.slice(1)}
              selected={activeTab.value === id}
              closable={id !== 'library'}
              leading={
                id === 'library' ? icon(PanelLeft, 'panel-left') : undefined
              }
              closeIcon={
                id === 'guidelines' ? icon(X, 'custom-tab-close') : undefined
              }
              rootAttributes={
                id === 'guidelines' ? extensionAttributes : undefined
              }
            />
          ))}
        </TabBar>
      </CatalogExample>
      <CatalogExample align="none">
        <TabBar id="placeholder-app-tabs" label="Loading documents">
          {(['first', 'second', 'third'] as const).map((id) => (
            <AppTab id={id} name="" closable={id !== 'first'} placeholder />
          ))}
        </TabBar>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

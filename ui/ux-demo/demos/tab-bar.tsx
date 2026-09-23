import { AppTab } from '@kerfjs/ui/app-tab';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { Plus } from 'lucide';

import { icon } from './state.js';

const tabs = (presentation: 'pill' | 'segmented' = 'pill') => [
  <AppTab
    id={`${presentation}-one`}
    name="Overview"
    selected
    closable={false}
    presentation={presentation}
    size={presentation === 'segmented' ? 'compact' : 'default'}
  />,
  <AppTab
    id={`${presentation}-two`}
    name="Activity"
    closable={false}
    presentation={presentation}
    size={presentation === 'segmented' ? 'compact' : 'default'}
  />,
];

export function TabBarDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'tab-bar' }}>
      <CatalogExample label="Rail · intrinsic allocation" align="none">
        <TabBar id="rail-tab-bar" label="Rail tab bar">
          {tabs()}
        </TabBar>
      </CatalogExample>
      <CatalogExample label="Segmented · fill allocation" align="none">
        <TabBar
          id="segmented-tab-bar"
          label="Segmented tab bar"
          presentation="segmented"
          allocation="fill"
        >
          {tabs('segmented')}
        </TabBar>
      </CatalogExample>
      <CatalogExample label="Inspector · adjacent action" align="none">
        <TabBar
          id="inspector-tab-bar"
          label="Inspector tab bar"
          presentation="inspector"
          allocation="fill"
          trailingPlacement="adjacent"
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <button type="button" aria-label="Add inspector section">
                {icon(Plus, 'plus')}
              </button>
            </ToolbarControlGroup>
          }
        >
          {tabs('segmented')}
        </TabBar>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

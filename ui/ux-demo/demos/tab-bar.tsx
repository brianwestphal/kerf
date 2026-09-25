import { AppTab } from '@kerfjs/ui/app-tab';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { Plus, SquarePlus } from 'lucide';

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

const splitTabs = [
  'Overview',
  'Backlog',
  'Activity',
  'Automations',
  'Settings',
].map((name, index) => (
  <AppTab
    id={`split-${name.toLowerCase()}`}
    name={name}
    selected={index === 0}
    closable={false}
    presentation="segmented"
    size="compact"
  />
));

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
      <CatalogExample label="Inspector · adjacent and end actions" align="none">
        <TabBar
          id="inspector-tab-bar"
          label="Inspector tab bar"
          presentation="inspector"
          trailingPlacement="adjacent"
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <button type="button" aria-label="Add inspector section">
                <LucideIcon icon={Plus} name="plus" />
              </button>
            </ToolbarControlGroup>
          }
          end={
            <ToolbarControlGroup appearance="borderless" single>
              <button type="button" aria-label="Create workspace item">
                <LucideIcon icon={SquarePlus} name="square-plus" />
              </button>
            </ToolbarControlGroup>
          }
        >
          {splitTabs}
        </TabBar>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

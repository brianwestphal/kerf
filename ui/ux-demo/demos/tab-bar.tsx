import { AppTab } from '@kerfjs/ui/app-tab';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { LayoutGrid, PanelLeft, Plus, SquarePlus } from 'lucide';

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

const overflowTabs = [
  'Overview',
  'Backlog',
  'Activity',
  'Automations',
  'Settings',
  'Releases',
  'Milestones',
  'Reports',
  'Integrations',
  'Members',
].map((name, index) => (
  <AppTab
    id={`overflow-${name.toLowerCase()}`}
    name={name}
    selected={index === 0}
    closable={false}
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
      <CatalogExample
        label="Responsive icon-only segmented tabs"
        note="The tablist switches at 832px of its own width; each tab keeps its accessible name when its visible name hides."
        align="none"
      >
        <TabBar
          id="responsive-icon-tab-bar"
          label="Responsive project tabs"
          presentation="segmented"
          iconOnlyAt="wide"
        >
          <AppTab
            id="responsive-overview"
            name="Overview"
            selected
            closable={false}
            presentation="segmented"
            size="compact"
            leading={<LucideIcon icon={PanelLeft} name="panel-left" />}
          />
          <AppTab
            id="responsive-activity"
            name="Activity"
            closable={false}
            presentation="segmented"
            size="compact"
            leading={<LucideIcon icon={SquarePlus} name="square-plus" />}
          />
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
      <CatalogExample
        label="Project strip · primary action"
        note="A standalone Web Awesome action keeps its own brand chrome at the far edge while tabs shrink and scroll."
        align="none"
      >
        <TabBar
          id="raw-action-tab-bar"
          label="Project tabs with primary action"
          trailingPlacement="adjacent"
          trailing={
            <wa-button appearance="plain" data-action="log-more">
              Add tab
            </wa-button>
          }
          end={
            <wa-button variant="brand" data-action="log-add">
              New ticket…
            </wa-button>
          }
        >
          {overflowTabs}
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Compact project tabs"
        align="none"
        viewport={{
          tokens: {
            '--kui-tab-bar-strip-min-height': '36px',
            '--kui-tab-bar-strip-padding': '2px',
            '--kui-tab-bar-strip-gap': '4px',
            '--kui-tab-bar-strip-radius': '10px',
            '--kui-tab-bar-strip-background':
              'var(--kui-color-neutral-fill-quiet)',
            '--kui-app-tab-attention-color':
              'var(--kui-color-warning-on-quiet)',
          },
        }}
      >
        <TabBar id="compact-project-tab-bar" label="Compact project tabs">
          <AppTab
            id="compact-inspector"
            name="Inspector"
            presentation="icon-only"
            size="compact"
            closable={false}
            leading={<LucideIcon icon={PanelLeft} name="panel-left" />}
          />
          <AppTab
            id="compact-attention"
            name="A project with a longer name"
            size="compact"
            labelMaxWidth={112}
            attention
            closable={false}
          />
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Overflow · scroll dividers"
        note="When the tabs overflow, a divider marks each side of the strip with tabs scrolled out of view. wireScrollDividers reports the strip's scroll state; the tab bar draws the lines."
        align="none"
      >
        <TabBar
          id="overflow-tab-bar"
          label="Overflowing tab bar"
          leading={
            <ToolbarControlGroup appearance="borderless" single>
              <button type="button" aria-label="Show sidebar">
                <LucideIcon icon={PanelLeft} name="panel-left" />
              </button>
            </ToolbarControlGroup>
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <button type="button" aria-label="Add tab">
                <LucideIcon icon={Plus} name="plus" />
              </button>
            </ToolbarControlGroup>
          }
        >
          {overflowTabs}
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Pinned leading tab"
        note="The compact icon-only Project grid tab remains visible while labeled tabs scroll beneath it."
        align="none"
        viewport={{
          width: 'compact',
          tokens: {
            '--kui-tab-bar-strip-padding': '4px',
            '--kui-tab-bar-strip-gap': '8px',
          },
        }}
      >
        <TabBar id="pinned-tab-bar" label="Pinned project tabs">
          <AppTab
            id="project-grid"
            name="Project grid"
            pinned
            selected
            closable={false}
            presentation="icon-only"
            size="compact"
            leading={<LucideIcon icon={LayoutGrid} name="layout-grid" />}
          />
          {[
            'Claude 1',
            'Backlog',
            'Activity',
            'Automations',
            'Settings',
            'Releases',
            'Milestones',
            'Reports',
          ].map((name) => (
            <AppTab
              id={`pinned-${name.toLowerCase().replaceAll(' ', '-')}`}
              name={name}
              closable={false}
              size="compact"
            />
          ))}
        </TabBar>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

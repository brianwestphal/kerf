import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { TabBarItem } from '@kerfjs/ui/tab-bar-item';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import type { TabBarFit } from '@kerfjs/ui/wire-tab-bars';
import { signal } from 'kerfjs';
import { LayoutGrid, PanelLeft, Plus, SquarePlus } from 'lucide';

/** The adaptive example's bar id, whose fit `adaptTabBarDemoEnd` follows. */
export const ADAPTIVE_END_TAB_BAR_ID = 'adaptive-end-tab-bar';
/** App-owned: the adaptive example shows its compact end action. */
export const adaptiveEndCompact = signal(false);
let wideEndWidth = 0;

/**
 * The `wireTabBars` `onFitChange` handler for the adaptive example. While the
 * wide end action is shown, remember its width and swap to the compact one as
 * soon as the tabs overflow; swap back only once the free room covers the
 * difference, so the bar never oscillates between the two.
 */
export function adaptTabBarDemoEnd(fit: TabBarFit): void {
  if (fit.barId !== ADAPTIVE_END_TAB_BAR_ID) return;
  if (!adaptiveEndCompact.value) {
    wideEndWidth = fit.endWidth;
    if (fit.overflowing) adaptiveEndCompact.value = true;
  } else if (fit.free >= wideEndWidth - fit.endWidth) {
    adaptiveEndCompact.value = false;
  }
}

/** Start each visit with the wide end action. */
export function resetTabBarDemo(): void {
  adaptiveEndCompact.value = false;
  wideEndWidth = 0;
}

const tabs = (presentation: 'pill' | 'segmented' = 'pill') => [
  <TabBarItem
    id={`${presentation}-one`}
    name="Overview"
    selected
    closable={false}
    presentation={presentation}
    size={presentation === 'segmented' ? 'compact' : 'default'}
  />,
  <TabBarItem
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
  <TabBarItem
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
  <TabBarItem
    id={`overflow-${name.toLowerCase()}`}
    name={name}
    selected={index === 0}
    closable={false}
  />
));

export function TabBarDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'tab-bar' }}>
      <CatalogExample label="Rail · Intrinsic Allocation" align="none">
        <TabBar id="rail-tab-bar" label="Rail Tab Bar">
          {tabs()}
        </TabBar>
      </CatalogExample>
      <CatalogExample label="Segmented · Fill Allocation" align="none">
        <TabBar
          id="segmented-tab-bar"
          label="Segmented Tab Bar"
          presentation="segmented"
          allocation="fill"
        >
          {tabs('segmented')}
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Responsive Icon-Only Segmented Tabs"
        note="The tablist switches at 832px of its own width; each tab keeps its accessible name when its visible name hides."
        align="none"
      >
        <TabBar
          id="responsive-icon-tab-bar"
          label="Responsive Project Tabs"
          presentation="segmented"
          iconOnlyAt="wide"
        >
          <TabBarItem
            id="responsive-overview"
            name="Overview"
            selected
            closable={false}
            presentation="segmented"
            size="compact"
            leading={<LucideIcon icon={PanelLeft} name="panel-left" />}
          />
          <TabBarItem
            id="responsive-activity"
            name="Activity"
            closable={false}
            presentation="segmented"
            size="compact"
            leading={<LucideIcon icon={SquarePlus} name="square-plus" />}
          />
        </TabBar>
      </CatalogExample>
      <CatalogExample label="Inspector · Adjacent and End Actions" align="none">
        <TabBar
          id="inspector-tab-bar"
          label="Inspector Tab Bar"
          presentation="inspector"
          trailingPlacement="adjacent"
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarButton
                ariaLabel="Add Inspector Section"
                icon={<LucideIcon icon={Plus} name="plus" />}
              />
            </ToolbarControlGroup>
          }
          end={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarButton
                ariaLabel="Create Workspace Item"
                icon={<LucideIcon icon={SquarePlus} name="square-plus" />}
              />
            </ToolbarControlGroup>
          }
        >
          {splitTabs}
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Project Strip · Primary Action"
        note="Standalone Kerf Buttons keep their own chrome in both action zones while tabs shrink and scroll."
        align="none"
      >
        <TabBar
          id="raw-action-tab-bar"
          label="Project Tabs with Primary Action"
          leading={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarButton
                ariaLabel="Project Grid"
                action="log-more"
                icon={<LucideIcon icon={LayoutGrid} name="layout-grid" />}
              />
            </ToolbarControlGroup>
          }
          trailingPlacement="adjacent"
          trailing={
            <Button emphasis="plain" action="log-more">
              Add Tab
            </Button>
          }
          end={
            <Button tone="brand" action="log-add">
              New Ticket…
            </Button>
          }
        >
          {overflowTabs}
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Single Project Tab · Shrinks Before Scrolling"
        note="In intrinsic allocation, tabs give up width by ellipsizing their names down to a minimum before the strip scrolls; the action zones keep their width. Narrow the viewport to watch the name ellipsize."
        align="none"
      >
        <TabBar
          id="shrinking-tab-bar"
          label="Workspace Project Tabs"
          leading={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarButton
                ariaLabel="Dashboard"
                icon={<LucideIcon icon={LayoutGrid} name="layout-grid" />}
              />
            </ToolbarControlGroup>
          }
          trailingPlacement="adjacent"
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarButton
                ariaLabel="Add Project"
                icon={<LucideIcon icon={Plus} name="plus" />}
              />
            </ToolbarControlGroup>
          }
          end={
            <Button tone="brand" action="log-add">
              New Ticket…
            </Button>
          }
        >
          <TabBarItem
            id="shrinking-terminal-feedback"
            name="Terminal feedback"
            selected
          />
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Adaptive End Action"
        note="wireTabBars reports each bar's fit through onFitChange. While the tabs overflow, the app swaps the wide New Ticket… action for an icon button, and restores it once the free room covers the difference. Narrow the viewport to watch it swap."
        align="none"
      >
        <TabBar
          id={ADAPTIVE_END_TAB_BAR_ID}
          label="Adaptive Project Tabs"
          end={
            adaptiveEndCompact.value ? (
              <ToolbarControlGroup appearance="borderless" single>
                <ToolbarButton
                  ariaLabel="New Ticket…"
                  action="log-add"
                  icon={<LucideIcon icon={SquarePlus} name="square-plus" />}
                />
              </ToolbarControlGroup>
            ) : (
              <Button tone="brand" action="log-add">
                New Ticket…
              </Button>
            )
          }
        >
          <TabBarItem
            id="adaptive-terminal-feedback"
            name="Terminal feedback"
            selected
            attention
          />
          <TabBarItem id="adaptive-release-notes" name="Release notes" />
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Compact Project Tabs"
        align="none"
        viewport={{
          tokens: {
            '--kui-tab-bar-strip-min-height': '36px',
            '--kui-tab-bar-strip-padding': '2px',
            '--kui-tab-bar-strip-gap': '4px',
            '--kui-tab-bar-strip-radius': '10px',
            '--kui-tab-bar-strip-background':
              'var(--kui-color-neutral-fill-quiet)',
            '--kui-tab-bar-item-attention-color':
              'var(--kui-color-warning-on-quiet)',
          },
        }}
      >
        <TabBar id="compact-project-tab-bar" label="Compact Project Tabs">
          <TabBarItem
            id="compact-inspector"
            name="Inspector"
            presentation="icon-only"
            size="compact"
            closable={false}
            leading={<LucideIcon icon={PanelLeft} name="panel-left" />}
          />
          <TabBarItem
            id="compact-attention"
            name="A Project with a Longer Name"
            size="compact"
            labelMaxWidth={112}
            attention
            closable={false}
          />
        </TabBar>
      </CatalogExample>
      <CatalogExample
        label="Overflow · Scroll Dividers"
        note="When the tabs overflow, a divider marks each side of the strip with tabs scrolled out of view. wireScrollDividers reports the strip's scroll state; the tab bar draws the lines."
        align="none"
      >
        <TabBar
          id="overflow-tab-bar"
          label="Overflowing Tab Bar"
          leading={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarButton
                ariaLabel="Show Sidebar"
                icon={<LucideIcon icon={PanelLeft} name="panel-left" />}
              />
            </ToolbarControlGroup>
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarButton
                ariaLabel="Add Tab"
                icon={<LucideIcon icon={Plus} name="plus" />}
              />
            </ToolbarControlGroup>
          }
        >
          {overflowTabs}
        </TabBar>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

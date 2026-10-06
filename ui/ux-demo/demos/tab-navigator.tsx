import '@kerfjs/ui/tab-navigator.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/list-item.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-text.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { NavStack, type NavStackView } from '@kerfjs/ui/nav-stack';
import { TabNavigator, type TabNavigatorTab } from '@kerfjs/ui/tab-navigator';
import { signal } from 'kerfjs';
import { ChevronRight, FolderKanban, Search, Settings } from 'lucide';

import { DemoContentItem } from './demo-content-item.js';

type DemoTabId = 'projects' | 'search' | 'settings';

const scene = (title: string, detail: string) => (
  <div class="kui-content">
    <DemoContentItem title={title} detail={detail} />
  </div>
);

const tabs: readonly TabNavigatorTab<DemoTabId>[] = [
  {
    id: 'projects',
    appearance: 'sunken',
    label: 'Projects',
    icon: <LucideIcon icon={FolderKanban} name="folder-kanban" />,
    badge: 3,
    badgeLabel: '3 updated',
    content: scene('Projects', 'Each destination stays mounted when inactive.'),
  },
  {
    id: 'search',
    label: 'Search',
    deepInset: true,
    icon: <LucideIcon icon={Search} name="search" />,
    content: scene('Search', 'This plain scene uses a deeper content inset.'),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <LucideIcon icon={Settings} name="settings" />,
    badge: true,
    badgeLabel: 'Update available',
    content: scene(
      'Settings',
      'Promote these destinations to a rail on desktop.',
    ),
  },
];

const activeTab = signal<DemoTabId>('projects');
const nestedActiveTab = signal<'projects' | 'search'>('projects');

const projectRoot = (): NavStackView => ({
  key: 'projects',
  toolbar: { title: 'Projects' },
  pane: { appearance: 'sunken' },
  content: (
    <List>
      <ListItem
        action="open-tab-scaffold-project"
        itemId="atlas"
        label="Project Atlas"
        description="Open this project while keeping the tab bar in place."
        trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
      />
    </List>
  ),
});

const projectDetail = (): NavStackView => ({
  key: 'atlas',
  toolbar: { title: 'Project Atlas' },
  pane: { appearance: 'sunken' },
  content: (
    <List>
      <DemoContentItem
        title="Project Atlas"
        detail="The stack owns this toolbar and pane. The scaffold keeps the bottom tab bar."
        focusTarget
        rootAttributes={{ 'data-nav-focus': '' }}
      />
    </List>
  ),
});

const nestedViews = signal<NavStackView[]>([projectRoot()]);

export function resetTabNavigatorDemo(): void {
  activeTab.value = 'projects';
  nestedActiveTab.value = 'projects';
  nestedViews.value = [projectRoot()];
}

export function selectTabNavigatorDemo(id: string): void {
  if (id === 'projects' || id === 'search' || id === 'settings')
    activeTab.value = id;
}

export function selectNestedTabNavigatorDemo(id: string): void {
  if (id === 'projects' || id === 'search') nestedActiveTab.value = id;
}

export function pushNestedTabNavigatorDemo(): void {
  if (nestedViews.value.length === 1)
    nestedViews.value = [...nestedViews.value, projectDetail()];
}

export function popNestedTabNavigatorDemo(): void {
  if (nestedViews.value.length > 1)
    nestedViews.value = nestedViews.value.slice(0, -1);
}

export function TabNavigatorDemo() {
  return (
    <CatalogExampleStack
      label="Compact application tabs"
      rootAttributes={{ 'data-demo': 'tab-navigator' }}
    >
      <CatalogExample
        label="Persistent tab scenes"
        note="The controlled active id changes the visible scene; every tab scene remains mounted so its own stack and scroll position survive. A count badge or a text-free dot sits at the icon's top-trailing corner, and its badgeLabel joins the tab's accessible name."
        viewport={{ layout: 'grid', width: 'compact', height: 'tall' }}
      >
        <TabNavigator
          id="catalog-tab-scaffold"
          label="Application sections"
          tabs={tabs}
          active={activeTab.value}
        />
      </CatalogExample>
      <CatalogExample
        label="NavStack inside a tab"
        note="The Projects tab owns a NavStack with its own top toolbar and Pane. Open the project, switch to Search, then return: the detail stays mounted. The stack has no bottom toolbar, so the scaffold bar remains the only bottom chrome."
        viewport={{ layout: 'grid', width: 'compact', height: 'tall' }}
      >
        <TabNavigator
          id="catalog-tab-scaffold-nested"
          label="Project sections"
          active={nestedActiveTab.value}
          tabs={[
            {
              id: 'projects',
              label: 'Projects',
              icon: <LucideIcon icon={FolderKanban} name="folder-kanban" />,
              content: (
                <NavStack
                  id="catalog-tab-scaffold-project-stack"
                  label="Projects navigation"
                  views={nestedViews.value}
                />
              ),
            },
            {
              id: 'search',
              label: 'Search',
              icon: <LucideIcon icon={Search} name="search" />,
              content: scene('Search', 'The Projects stack remains mounted.'),
            },
          ]}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

import '@kerfjs/ui/tab-scaffold.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { TabScaffold, type TabScaffoldTab } from '@kerfjs/ui/tab-scaffold';
import { signal } from 'kerfjs';
import { FolderKanban, Search, Settings } from 'lucide';

import { DemoContentItem } from './demo-content-item.js';

type DemoTabId = 'projects' | 'search' | 'settings';

const scene = (title: string, detail: string) => (
  <div class="kui-content">
    <DemoContentItem title={title} detail={detail} />
  </div>
);

const tabs: readonly TabScaffoldTab<DemoTabId>[] = [
  {
    id: 'projects',
    label: 'Projects',
    icon: <LucideIcon icon={FolderKanban} name="folder-kanban" />,
    badge: 3,
    badgeLabel: '3 updated',
    content: scene('Projects', 'Each destination stays mounted when inactive.'),
  },
  {
    id: 'search',
    label: 'Search',
    icon: <LucideIcon icon={Search} name="search" />,
    content: scene('Search', 'Selection is controlled by the application.'),
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

export function resetTabScaffoldDemo(): void {
  activeTab.value = 'projects';
}

export function selectTabScaffoldDemo(id: string): void {
  if (id === 'projects' || id === 'search' || id === 'settings')
    activeTab.value = id;
}

export function TabScaffoldDemo() {
  return (
    <CatalogExampleStack
      label="Compact application tabs"
      rootAttributes={{ 'data-demo': 'tab-scaffold' }}
    >
      <CatalogExample
        label="Persistent tab scenes"
        note="The controlled active id changes the visible scene; every tab scene remains mounted so its own stack and scroll position survive. A count badge or a text-free dot sits at the icon's top-trailing corner, and its badgeLabel joins the tab's accessible name."
        viewport={{ layout: 'grid', width: 'compact', height: 'tall' }}
      >
        <TabScaffold
          id="catalog-tab-scaffold"
          label="Application sections"
          tabs={tabs}
          active={activeTab.value}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

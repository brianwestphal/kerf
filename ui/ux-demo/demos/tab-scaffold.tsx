import './tab-scaffold.css';
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
        note="The controlled active id changes the visible scene; every tab scene remains mounted so its own stack and scroll position survive."
      >
        <div class="demo-tab-scaffold">
          <TabScaffold
            id="catalog-tab-scaffold"
            label="Application sections"
            tabs={tabs}
            active={activeTab.value}
          />
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

import './nav-stack.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/list-header.css';
import '@kerfjs/ui/list-item.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-text.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { NavStack, type NavStackView } from '@kerfjs/ui/nav-stack';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';
import { ChevronRight, FileText, Folder } from 'lucide';

import { DemoContentItem } from './demo-content-item.js';

interface Project {
  id: string;
  label: string;
  summary: string;
}

const PROJECTS: Project[] = [
  {
    id: 'atlas',
    label: 'Project Atlas',
    summary: 'Navigation and workspace patterns for the Kerf UI catalog.',
  },
  {
    id: 'relay',
    label: 'Project Relay',
    summary:
      'Interaction contracts shared across responsive application layouts.',
  },
];

const footer = (text: string) => (
  <Toolbar
    label="View status"
    dividerSides=""
    leading={<ToolbarText text={text} size="small" />}
  />
);

const rootView = (): NavStackView => ({
  key: 'library',
  title: 'Library',
  toolbar: <ToolbarText text="Projects" size="small" />,
  bottomToolbar: footer('2 saved projects'),
  content: (
    <List>
      {[
        <ListHeader
          label="Saved projects"
          count={PROJECTS.length}
          countLabel={`${PROJECTS.length} saved projects`}
        />,
        ...PROJECTS.map((project) => (
          <ListItem
            action="open-nav-stack-project"
            itemId={project.id}
            label={project.label}
            description={project.summary}
            icon={<LucideIcon icon={Folder} name="folder" />}
            trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
            multiline
          />
        )),
      ]}
    </List>
  ),
});

const detailView = (project: Project): NavStackView => ({
  key: `project-${project.id}`,
  title: project.label,
  toolbar: <ToolbarText text="Detail" size="small" />,
  bottomToolbar: footer('Updated just now'),
  content: (
    <List>
      <DemoContentItem
        title={project.label}
        detail={project.summary}
        leading={<LucideIcon icon={FileText} name="file-text" />}
        rootAttributes={{
          tabindex: '-1',
          'data-nav-focus': '',
          'data-nav-detail-focus': '',
          'aria-label': `${project.label} details`,
        }}
      />
    </List>
  ),
});

const demoViews = signal<NavStackView[]>([rootView()]);

export function resetNavStackDemo(): void {
  demoViews.value = [rootView()];
}

export function pushNavStackDemo(projectId: string): void {
  if (demoViews.value.length > 1) return;
  const project = PROJECTS.find(({ id }) => id === projectId);
  if (project) demoViews.value = [...demoViews.value, detailView(project)];
}

export function popNavStackDemo(): void {
  if (demoViews.value.length > 1)
    demoViews.value = demoViews.value.slice(0, -1);
}

export function NavStackDemo() {
  return (
    <CatalogExampleStack
      label="Navigation stack states"
      rootAttributes={{ 'data-demo': 'nav-stack' }}
    >
      <CatalogExample
        label="Interactive push and pop"
        note="Choose a project to push its detail. The content slides while the view-owned title, actions, and bottom status cross-fade; Back pops to the preserved list."
      >
        <div class="demo-nav-stack">
          <NavStack
            id="catalog-nav-stack"
            label="Project library"
            views={demoViews.value}
            backLabel="Back to library"
          />
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

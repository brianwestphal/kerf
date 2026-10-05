import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/list-header.css';
import '@kerfjs/ui/list-item.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/toolbar-text.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { NavStack, type NavStackView } from '@kerfjs/ui/nav-stack';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';
import {
  ChevronRight,
  FileText,
  Folder,
  LayoutGrid,
  List as ListIcon,
  PanelLeft,
  Share,
} from 'lucide';

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

const footer = (text: string) => ({
  label: 'View status',
  leading: <ToolbarText text={text} size="small" />,
});

const rootView = (): NavStackView => ({
  key: 'library',
  pane: { appearance: 'sunken' },
  toolbar: {
    title: 'Library',
    trailing: <ToolbarText text="Projects" size="small" />,
  },
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
  toolbar: {
    title: project.label,
    trailing: <ToolbarText text="Detail" size="small" />,
  },
  bottomToolbar: footer('Updated just now'),
  content: (
    <List>
      <DemoContentItem
        title={project.label}
        detail={project.summary}
        leading={<LucideIcon icon={FileText} name="file-text" />}
        ariaLabel={`${project.label} details`}
        focusTarget
        rootAttributes={{ 'data-nav-focus': '', 'data-nav-detail-focus': '' }}
      />
    </List>
  ),
});

/** A demo command button; the catalog's action log records its label. */
const iconButton = (
  label: string,
  icon: typeof Folder,
  name: string,
  pressed?: boolean,
) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={pressed === undefined ? undefined : String(pressed)}
    data-action="nav-stack-demo-command"
  >
    <LucideIcon icon={icon} name={name} />
  </button>
);

const configuredRootView = (): NavStackView => ({
  key: 'library',
  toolbar: {
    title: 'Library',
    leading: (
      <ToolbarControlGroup label="Sidebar" appearance="borderless" single>
        {iconButton('Show sidebar', PanelLeft, 'panel-left')}
      </ToolbarControlGroup>
    ),
    center: (
      <ToolbarControlGroup label="Project layout">
        {iconButton('List layout', ListIcon, 'list', true)}
        {iconButton('Grid layout', LayoutGrid, 'layout-grid', false)}
      </ToolbarControlGroup>
    ),
  },
  content: (
    <List>
      {PROJECTS.map((project) => (
        <ListItem
          action="open-configured-nav-stack-project"
          itemId={project.id}
          label={project.label}
          icon={<LucideIcon icon={Folder} name="folder" />}
          trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
        />
      ))}
    </List>
  ),
});

const configuredDetailView = (project: Project): NavStackView => ({
  key: `project-${project.id}`,
  toolbar: {
    title: project.label,
    trailing: (
      <ToolbarControlGroup label="Share" appearance="borderless" single>
        {iconButton('Share project', Share, 'share')}
      </ToolbarControlGroup>
    ),
  },
  content: (
    <List>
      <DemoContentItem
        title={project.label}
        detail={project.summary}
        leading={<LucideIcon icon={FileText} name="file-text" />}
        ariaLabel={`${project.label} details`}
        focusTarget
        rootAttributes={{ 'data-nav-focus': '' }}
      />
    </List>
  ),
});

const demoViews = signal<NavStackView[]>([rootView()]);
const configuredViews = signal<NavStackView[]>([configuredRootView()]);

export function resetNavStackDemo(): void {
  demoViews.value = [rootView()];
  configuredViews.value = [configuredRootView()];
}

export function pushConfiguredNavStackDemo(projectId: string): void {
  if (configuredViews.value.length > 1) return;
  const project = PROJECTS.find(({ id }) => id === projectId);
  if (project)
    configuredViews.value = [
      ...configuredViews.value,
      configuredDetailView(project),
    ];
}

export function popConfiguredNavStackDemo(): void {
  if (configuredViews.value.length > 1)
    configuredViews.value = configuredViews.value.slice(0, -1);
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
        viewport={{ layout: 'grid', width: 'compact', height: 'tall' }}
      >
        <NavStack
          id="catalog-nav-stack"
          label="Project library"
          views={demoViews.value}
          backLabel="Back to library"
        />
      </CatalogExample>
      <CatalogExample
        label="Configured toolbar"
        note="toolbarConfig exposes the title as a level-2 heading with a bottom divider. The library view adds leading and center groups, the pushed project a trailing group, and backText names the previous view beside the back chevron."
        viewport={{ layout: 'grid', width: 'compact', height: 'short' }}
      >
        <NavStack
          id="catalog-nav-stack-configured"
          label="Configured project library"
          views={configuredViews.value}
          backText={configuredViews.value.at(-2)?.toolbar?.title}
          toolbarConfig={{ headingLevel: 2, dividerSides: 'b' }}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

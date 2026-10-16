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
import { Text } from '@kerfjs/ui/text';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';
import {
  Bell,
  Calendar,
  ChevronRight,
  FileText,
  Folder,
  Funnel,
  LayoutGrid,
  List as ListIcon,
  Mail,
  PanelLeft,
  Share,
  ShieldCheck,
  SquarePen,
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
  label: 'View Status',
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
          label="Saved Projects"
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
        ariaLabel={project.label}
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
        {iconButton('Show Sidebar', PanelLeft, 'panel-left')}
      </ToolbarControlGroup>
    ),
    center: (
      <ToolbarControlGroup label="Project Layout">
        {iconButton('List Layout', ListIcon, 'list', true)}
        {iconButton('Grid Layout', LayoutGrid, 'layout-grid', false)}
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
        {iconButton('Share Project', Share, 'share')}
      </ToolbarControlGroup>
    ),
  },
  content: (
    <List>
      <DemoContentItem
        title={project.label}
        detail={project.summary}
        leading={<LucideIcon icon={FileText} name="file-text" />}
        ariaLabel={project.label}
        focusTarget
        rootAttributes={{ 'data-nav-focus': '' }}
      />
    </List>
  ),
});

/** Inbox rows for the overlay chrome example: colored tiles show through it. */
const INBOX = Array.from({ length: 18 }, (_, index) => {
  const [label, icon, name, tone] = (
    [
      ['Design Review', Calendar, 'calendar', 'brand'],
      ['Backup Complete', ShieldCheck, 'shield-check', 'success'],
      ['Storage Almost Full', Bell, 'bell', 'warning'],
      ['Weekly Summary', Mail, 'mail', 'neutral'],
    ] as const
  )[index % 4]!;
  return { id: `overlay-inbox-${String(index + 1)}`, label, icon, name, tone };
});

/** The inbox as a List whose rows run `action`. */
const inboxList = (action: string) => (
  <List>
    {INBOX.map((message) => (
      <ListItem
        action={action}
        itemId={message.id}
        label={message.label}
        icon={<LucideIcon icon={message.icon} name={message.name} />}
        iconTile={message.tone}
      />
    ))}
  </List>
);

const overlayRootView = (): NavStackView => ({
  key: 'inbox',
  toolbar: { title: 'Inbox' },
  content: inboxList('open-overlay-nav-stack-message'),
});

// The stack's bottom toolbar, also laid over the views: content scrolls
// beneath it, and the last row rests just above it.
const overlayBottomToolbar = {
  label: 'Inbox Actions',
  leading: (
    <ToolbarControlGroup label="Filter" appearance="borderless" single>
      {iconButton('Filter Messages', Funnel, 'funnel')}
    </ToolbarControlGroup>
  ),
  center: <ToolbarText text="Updated Just Now" size="small" />,
  trailing: (
    <ToolbarControlGroup label="Compose" appearance="borderless" single>
      {iconButton('New Message', SquarePen, 'square-pen')}
    </ToolbarControlGroup>
  ),
};

// The pushed view is a sole Pane, which clears the chrome the same way.
const overlayDetailView = (label: string): NavStackView => ({
  key: 'message',
  toolbar: { title: label },
  pane: {},
  content: inboxList('log-inbox'),
});

/** The delegated action that shows and hides the compact example's filters. */
export const TOGGLE_COMPACT_CHROME_DEMO_ACTION = 'toggle-compact-chrome-demo';
const compactFiltersOpen = signal(false);

export function toggleCompactChromeDemo(): boolean {
  compactFiltersOpen.value = !compactFiltersOpen.value;
  return compactFiltersOpen.value;
}

// A compact view whose Pane declares its chrome policy: the filter header
// lies over the messages until the toolbar's Filter button opens it, and the
// footer action scrolls with the list instead of shrinking it.
const compactChromeView = (open: boolean): NavStackView => ({
  key: 'compact',
  toolbar: {
    title: 'Messages',
    trailing: (
      <ToolbarControlGroup label="Filter" appearance="borderless" single>
        <button
          type="button"
          aria-label={open ? 'Hide Filters' : 'Show Filters'}
          aria-pressed={String(open)}
          data-action={TOGGLE_COMPACT_CHROME_DEMO_ACTION}
        >
          <LucideIcon icon={Funnel} name="funnel" />
        </button>
      </ToolbarControlGroup>
    ),
  },
  header: (
    <Text size="compact" tone="quiet" flush>
      Showing unread messages from this week
    </Text>
  ),
  headerList: { textInsets: 'trbl' },
  footer: (
    <Text size="compact" tone="quiet" flush>
      18 messages, updated just now
    </Text>
  ),
  footerList: { textInsets: 'trbl' },
  pane: {
    compactChrome: { header: 'overlay', footer: 'scroll' },
    compactChromeOpen: { header: open },
  },
  content: inboxList('log-inbox'),
});

const demoViews = signal<NavStackView[]>([rootView()]);
const configuredViews = signal<NavStackView[]>([configuredRootView()]);
const overlayViews = signal<NavStackView[]>([overlayRootView()]);

export function resetNavStackDemo(): void {
  compactFiltersOpen.value = false;
  demoViews.value = [rootView()];
  configuredViews.value = [configuredRootView()];
  overlayViews.value = [overlayRootView()];
}

export function pushOverlayNavStackDemo(messageId: string): void {
  if (overlayViews.value.length > 1) return;
  const message = INBOX.find(({ id }) => id === messageId);
  if (message)
    overlayViews.value = [
      ...overlayViews.value,
      overlayDetailView(message.label),
    ];
}

export function popOverlayNavStackDemo(): void {
  if (overlayViews.value.length > 1)
    overlayViews.value = overlayViews.value.slice(0, -1);
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
      label="Navigation Stack States"
      rootAttributes={{ 'data-demo': 'nav-stack' }}
    >
      <CatalogExample
        label="Interactive Push and Pop"
        note="Choose a project to push its detail. The content slides while the view-owned title, actions, and bottom status cross-fade; Back pops to the preserved list."
        viewport={{
          layout: 'grid',
          width: 'compact',
          height: 'tall',
          frame: 'solid',
        }}
      >
        <NavStack
          id="catalog-nav-stack"
          label="Project Library"
          views={demoViews.value}
          backLabel="Back to Library"
        />
      </CatalogExample>
      <CatalogExample
        label="Configured Toolbar"
        note="toolbarConfig exposes the title as a level-2 heading with a bottom divider. The library view adds leading and center groups, the pushed project a trailing group, and backText names the previous view beside the back chevron."
        viewport={{
          layout: 'grid',
          width: 'compact',
          height: 'short',
          frame: 'solid',
        }}
      >
        <NavStack
          id="catalog-nav-stack-configured"
          label="Configured Project Library"
          views={configuredViews.value}
          backText={configuredViews.value.at(-2)?.toolbar?.title}
          toolbarConfig={{ headingLevel: 2, dividerSides: 'b' }}
        />
      </CatalogExample>
      <CatalogExample
        label="Overlay Chrome"
        note="chromePresentation and bottomToolbarPresentation overlay lay the top chrome and the bottom toolbar over the active view on the translucent chrome material, so messages scroll visibly beneath both. wireNavStack measures each bar, and each view, the plain list and the pushed message's Pane alike, rests its first row just below the top chrome and its last row just above the toolbar."
        viewport={{
          layout: 'grid',
          width: 'compact',
          height: 'tall',
          frame: 'solid',
        }}
      >
        <NavStack
          id="catalog-nav-stack-overlay"
          label="Overlay Inbox"
          views={overlayViews.value}
          backLabel="Back to Inbox"
          chromePresentation="overlay"
          bottomToolbarPresentation="overlay"
          bottomToolbar={overlayBottomToolbar}
        />
      </CatalogExample>
      <CatalogExample
        label="Compact Chrome"
        note="A view's Pane declares compactChrome and the stack applies it in its compact presentation: the filter header (overlay) lies over the messages until Filter opens it, and the status footer (scroll) settles after the last message instead of taking room from the list."
        viewport={{
          layout: 'grid',
          width: 'compact',
          height: 'tall',
          frame: 'solid',
        }}
      >
        <NavStack
          id="catalog-nav-stack-compact-chrome"
          label="Compact Chrome Messages"
          views={[compactChromeView(compactFiltersOpen.value)]}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

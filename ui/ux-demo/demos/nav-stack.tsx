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
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
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
  <ToolbarButton
    ariaLabel={label}
    icon={<LucideIcon icon={icon} name={name} />}
    pressed={pressed}
    action="nav-stack-demo-command"
  />
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
/** The delegated action a compact example row runs to push its thread. */
export const OPEN_COMPACT_CHROME_MESSAGE_ACTION = 'open-compact-chrome-message';
/** The compact example's filter overlay; `wirePaneChrome` closes it. */
export const compactFiltersOpen = signal(false);

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
        <ToolbarButton
          ariaLabel={open ? 'Hide Filters' : 'Show Filters'}
          action={TOGGLE_COMPACT_CHROME_DEMO_ACTION}
          pressed={open}
          icon={<LucideIcon icon={Funnel} name="funnel" />}
        />
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
  content: inboxList(OPEN_COMPACT_CHROME_MESSAGE_ACTION),
});

/** Replies in the pushed message's thread, long enough to scroll. */
const THREAD = [
  ['Avery', '9:02 AM', 'Moved the review to Thursday so design can join.'],
  ['Jordan', '9:15 AM', 'Thursday works. I will bring the navigation flows.'],
  ['Sam', '9:31 AM', 'Can we cover the compact layouts first?'],
  ['Avery', '9:40 AM', 'Yes, compact first, then the desktop workbench.'],
  ['Riley', '10:05 AM', 'I added the open questions to the agenda.'],
  ['Jordan', '10:22 AM', 'Thanks. I will share the prototype link tomorrow.'],
  ['Sam', '11:10 AM', 'Booked the large room with the projector.'],
  ['Avery', '11:48 AM', 'Great, see everyone Thursday at 10.'],
] as const;

// The pushed message's Pane declares its own policy: the sender line scrolls
// away with the thread, and the reply hint stays fixed below it.
const compactMessageView = (label: string): NavStackView => ({
  key: 'compact-message',
  toolbar: { title: label },
  header: (
    <Text size="compact" tone="quiet" flush>
      From the design team, 8 replies this morning
    </Text>
  ),
  headerList: { textInsets: 'trbl' },
  footer: (
    <Text size="compact" tone="quiet" flush>
      Replies go to everyone on the thread
    </Text>
  ),
  footerList: { textInsets: 'trbl' },
  pane: { compactChrome: { header: 'scroll', footer: 'fixed' } },
  content: (
    <List>
      {THREAD.map(([sender, time, text], index) => (
        <DemoContentItem
          title={sender}
          eyebrow={time}
          detail={text}
          focusTarget={index === 0}
          rootAttributes={index === 0 ? { 'data-nav-focus': '' } : undefined}
        />
      ))}
    </List>
  ),
});

/** The message the compact example has pushed, if any. */
const compactMessage = signal<string | null>(null);

const demoViews = signal<NavStackView[]>([rootView()]);
const configuredViews = signal<NavStackView[]>([configuredRootView()]);
const overlayViews = signal<NavStackView[]>([overlayRootView()]);

export function resetNavStackDemo(): void {
  compactFiltersOpen.value = false;
  compactMessage.value = null;
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

export function pushCompactChromeDemo(messageId: string): void {
  if (compactMessage.value !== null) return;
  const message = INBOX.find(({ id }) => id === messageId);
  if (!message) return;
  // The filters belong to the list, so they close as the thread covers it.
  compactFiltersOpen.value = false;
  compactMessage.value = message.label;
}

export function popCompactChromeDemo(): void {
  compactMessage.value = null;
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
        note="Each view's Pane declares compactChrome and the stack applies it in its compact presentation. In the list, the filter header (overlay) lies over the messages until Filter opens it, and the status footer (scroll) settles after the last message instead of taking room from the list. Choose a message to push its thread: its sender line (scroll) scrolls away with the replies, its reply hint (fixed) stays pinned, and Back pops to the list."
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
          views={[
            compactChromeView(compactFiltersOpen.value),
            ...(compactMessage.value === null
              ? []
              : [compactMessageView(compactMessage.value)]),
          ]}
          backLabel="Back to Messages"
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

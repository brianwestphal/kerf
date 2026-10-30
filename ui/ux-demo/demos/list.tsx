import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Chip } from '@kerfjs/ui/chip';
import { flex, rem } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListActionRow } from '@kerfjs/ui/list-action-row';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Text } from '@kerfjs/ui/text';
import { TextField } from '@kerfjs/ui/text-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { each } from 'kerfjs';
import {
  CircleHelp,
  FileText,
  Folder,
  Inbox,
  MoreHorizontal,
  Plus,
  Settings,
  Wrench,
} from 'lucide';

import { ViewTransitionListRow } from '../view-transition-list-row.js';
import { DemoContentItem } from './demo-content-item.js';
import { DemoFrameShell } from './demo-frame-shell.js';
import { menuToolsOpen } from './state.js';
import { viewTransitionListRows } from './view-transition-list-state.js';

/** Duplicate candidates for the Result Picker example. */
const RESULT_PICKER_CANDIDATES = [
  {
    id: 'result-1',
    title: 'Dialog footer hides the last message',
    detail: 'Closed last week, surface scaffold',
  },
  {
    id: 'result-2',
    title: 'Transcript stops above the composer',
    detail: 'Open, chat dialog',
  },
  {
    id: 'result-3',
    title: 'MessageComposer grows past the panel on phones',
    detail: 'Closed in September, composer',
  },
  {
    id: 'result-4',
    title: 'Floating footer loses its offset after resize',
    detail: 'Open, surface scaffold',
  },
  {
    id: 'result-5',
    title: 'Scrollable list compresses multiline rows',
    detail: 'Closed in August, list',
  },
] as const;

export function ListDemo() {
  const workspaceHeading: string | undefined = 'Workspace';
  const workspaceRows = [
    {
      action: 'log-projects',
      itemId: 'projects',
      label: 'Projects',
      icon: <LucideIcon icon={Folder} name="folder" />,
    },
    {
      action: 'log-drafts',
      itemId: 'drafts',
      label: 'Drafts Without a Visible Icon',
    },
  ];
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'list' }}>
      <CatalogExample
        label="Scrollable Application List"
        note="Pane owns the header/content/footer anatomy; the content List owns flex growth, scrolling, and a typed major gap."
        viewport={{ frame: 'solid' }}
      >
        <Pane
          header={
            <Toolbar
              label="Sidebar Toolbar"
              leading={<ToolbarText text="Workspace" size="small" />}
              trailing={
                <ToolbarControlGroup appearance="borderless" single>
                  <ToolbarButton
                    ariaLabel="Add Workspace"
                    action="log-add"
                    icon={<LucideIcon icon={Plus} name="plus" />}
                  />
                </ToolbarControlGroup>
              }
            />
          }
          footer={
            <Toolbar
              label="Sidebar Footer"
              leading={<ToolbarText text="Ready" size="small" />}
              trailing={
                <ToolbarControlGroup appearance="borderless" single>
                  <ToolbarButton
                    ariaLabel="Sidebar Settings"
                    action="log-settings"
                    icon={<LucideIcon icon={Settings} name="settings" />}
                  />
                </ToolbarControlGroup>
              }
            />
          }
        >
          <List gap={{ column: 'none', row: 'l' }} flex={flex(1)} scrollable>
            <section>
              <List>
                {workspaceHeading !== undefined ? (
                  <ListHeader
                    label={workspaceHeading}
                    count={3}
                    countLabel="3 workspaces"
                    action="log-add"
                    actionLabel="Add workspace"
                    actionIcon={<LucideIcon icon={Plus} name="plus" />}
                  />
                ) : null}
                <ListItem
                  action="log-inbox"
                  itemId="inbox"
                  label="Inbox"
                  icon={<LucideIcon icon={Inbox} name="inbox" />}
                  trailing={<span>12</span>}
                  selected
                />
                {workspaceRows.map((row) => (
                  <ListItem {...row} />
                ))}
              </List>
            </section>
            <section>
              <List gap="xs">
                <ListHeader
                  label="Tools"
                  toggle
                  expanded={menuToolsOpen.value}
                  action="toggle-menu-tools"
                  triggerAttributes={{
                    'aria-controls': 'menu-tools-content',
                  }}
                />
                <div id="menu-tools-content" hidden={!menuToolsOpen.value}>
                  <ListItem
                    action="log-settings"
                    label="A multiline item demonstrates content that wraps without clipping"
                    icon={<LucideIcon icon={Wrench} name="wrench" />}
                    multiline
                  />
                  <ListItem
                    action="disabled"
                    label="Unavailable"
                    icon={<LucideIcon icon={CircleHelp} name="circle-help" />}
                    disabled
                  />
                  <DemoContentItem
                    title="Shared Item Geometry"
                    detail="The child owns its margin, border, and padding."
                    rootAttributes={{ 'data-content-item': '' }}
                  />
                </div>
              </List>
            </section>
          </List>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Shared Row Dividers"
        note="Scope the public divider color on a List so headers, items, and action rows share the same line."
        align="none"
        viewport={{ width: 'medium' }}
      >
        <List rootAttributes={{ 'data-demo-divider-list': '' }}>
          <ListHeader label="Section" divider="both" />
          <ListItem
            action="log-inbox"
            itemId="divider-row"
            label="Regular Row"
            divider="both"
          />
          <ListActionRow
            action="log-projects"
            itemId="divider-action-row"
            label="Action Row"
            divider="both"
            trailingAction="log-settings"
            trailingActionLabel="Action row options"
            trailingActionIcon={
              <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
            }
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Shared Row Inset"
        note="Scope --kui-list-row-padding-inline on a List so ListItem and ListActionRow rows start their leading icons on one edge; it defaults to the 8px item padding. Both row kinds share the 18px --kui-list-row-icon-size, so their labels line up too."
        align="none"
        viewport={{
          width: 'medium',
          tokens: { '--kui-list-row-padding-inline': 'var(--kui-space-s)' },
        }}
      >
        <List rootAttributes={{ 'data-demo-row-inset-list': '' }}>
          <ListItem
            action="log-inbox"
            itemId="inset-inbox"
            label="Inbox"
            icon={<LucideIcon icon={Inbox} name="inbox" />}
          />
          <ListActionRow
            action="log-projects"
            itemId="inset-projects"
            label="Projects"
            icon={<LucideIcon icon={Folder} name="folder" />}
            trailingAction="log-settings"
            trailingActionLabel="Project Options"
            trailingActionIcon={
              <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
            }
          />
          <ListItem
            action="log-settings"
            itemId="inset-settings"
            label="Settings"
            icon={<LucideIcon icon={Settings} name="settings" />}
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Physical-Axis Alignment"
        note="List keeps its stretch-and-top defaults when omitted; explicit horizontal and vertical alignment use the same vocabulary as Row."
      >
        <DemoFrameShell>
          <List gap="xs" hAlign="right" vAlign="full">
            <Chip>Top</Chip>
            <Chip>Middle</Chip>
            <Chip>Bottom</Chip>
          </List>
        </DemoFrameShell>
      </CatalogExample>
      <CatalogExample
        label="Side-Selectable Insets"
        note="Text insets apply the full 8px + 1px + 8px content geometry; control insets apply 8px, and text wins where both select a side."
      >
        <DemoFrameShell>
          <List gap="xs" textInsets="l" controlInsets="rb">
            <Chip>Text-aligned left edge</Chip>
            <TextField label="Inset List Control" value="Control edge" />
            <List textInsets="t">
              <Chip>Nested text-aligned top edge</Chip>
            </List>
          </List>
        </DemoFrameShell>
      </CatalogExample>
      <CatalogExample
        label="Surface Behind a Strip"
        note='surface="base" paints the page surface behind the stack and its insets, so a banner strip above a lowered work area does not show the sunken tint around it.'
        viewport={{ frame: 'solid', surface: 'lowered', overflow: 'hidden' }}
      >
        <List surface="base" controlInsets="tb" dividerSides="b">
          <StateBanner
            tone="info"
            title="Codex Hooks Are Not Installed"
            detail="Install them to sync agent activity."
            icon={<LucideIcon icon={CircleHelp} name="circle-help" />}
          />
        </List>
        <List controlInsets="tb">
          <DemoContentItem
            title="Work Area"
            detail="The lowered region continues below the strip."
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Document Inset"
        note='inset="document" gives long reading content 24px block and 32px inline insets, narrowing to 16px inline on phones; rootAttributes can name the stack as a region.'
        viewport={{ frame: 'solid', surface: 'default', overflow: 'hidden' }}
      >
        <List
          inset="document"
          gap="m"
          rootAttributes={{ role: 'region', 'aria-label': 'Reader' }}
        >
          <Text variant="h3">Release notes</Text>
          <Text>
            The reader keeps a generous inset so long lines of prose have room
            to breathe, without application padding around the stack.
          </Text>
          <Text>
            On a phone the inline inset narrows so the text column keeps a
            readable width.
          </Text>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Page Column"
        note='contentWidth="compact" caps a page column at a 440px measure plus its insets and centers it, here with the document inset; medium is 640px and wide 864px.'
        viewport={{
          width: 'full',
          frame: 'solid',
          surface: 'default',
          overflow: 'hidden',
        }}
      >
        <List
          inset="document"
          contentWidth="compact"
          gap="m"
          rootAttributes={{ 'data-demo-page-column': '' }}
        >
          <Text variant="h3">Settings</Text>
          <Text>
            A settings page keeps its forms at a readable width however wide the
            window grows, with no application CSS around the column.
          </Text>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Result Picker"
        note="frame draws a 1px neutral border with the control radius and a 4px inset that keeps the first and last rows' focus rings inside the clip; with scrollable, maxHeight and minHeight bound the candidates without an app-owned scroller."
        viewport={{ width: 'compact' }}
      >
        <List
          scrollable
          frame
          gap="2xs"
          minHeight={rem(4.25)}
          maxHeight={rem(14)}
          rootAttributes={{
            role: 'region',
            'aria-label': 'Possible Duplicates',
            'data-demo-result-picker': '',
          }}
        >
          {RESULT_PICKER_CANDIDATES.map((candidate) => (
            <ListItem
              action="log-result-picker"
              itemId={candidate.id}
              label={candidate.title}
              description={candidate.detail}
              multiline
            />
          ))}
        </List>
      </CatalogExample>
      <CatalogExample
        label="Divider Between Regions"
        note="dividerSides draws a 1px edge on the named physical sides. A navigation list beside a detail region takes a right divider, so the line marks the real boundary between the two."
        viewport={{
          width: 'compact',
          frame: 'solid',
          surface: 'default',
          overflow: 'hidden',
        }}
      >
        <Row gap="none">
          <List flex="none" dividerSides="r">
            <ListItem
              action="log-inbox"
              itemId="divider-inbox"
              label="Inbox"
              icon={<LucideIcon icon={Inbox} name="inbox" />}
              selected
            />
            <ListItem
              action="log-projects"
              itemId="divider-projects"
              label="Projects"
              icon={<LucideIcon icon={Folder} name="folder" />}
            />
            <ListItem
              action="log-drafts"
              itemId="divider-drafts"
              label="Drafts"
              icon={<LucideIcon icon={FileText} name="file-text" />}
            />
          </List>
          <List flex>
            <DemoContentItem
              title="Inbox"
              detail="12 unread conversations. The selected folder's contents appear in this region."
            />
          </List>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="List View Transitions"
        note={
          <>
            Reorder, insert, or remove named rows with the browser's document
            View Transition. The app wraps the source write and supplies the row
            names and motion; Kerf's <code>each()</code> preserves row identity.{' '}
            <a href="https://github.com/brianwestphal/kerf/blob/main/docs/view-transitions.md">
              Read the recipe
            </a>
            .
          </>
        }
        viewport={{ width: 'medium', frame: 'solid', surface: 'default' }}
      >
        <List gap="m" rootAttributes={{ 'data-demo-view-transitions': '' }}>
          <Row wrap>
            <Button
              action="view-transition-reorder"
              disabled={viewTransitionListRows.value.length < 2}
            >
              Reorder
            </Button>
            <Button
              action="view-transition-insert"
              disabled={viewTransitionListRows.value.some(
                (row) => row.id === 'd',
              )}
            >
              Insert Delta
            </Button>
            <Button
              action="view-transition-remove"
              disabled={viewTransitionListRows.value.length === 0}
            >
              Remove Last
            </Button>
            <Button emphasis="plain" action="view-transition-reset">
              Reset
            </Button>
          </Row>
          <List
            gap="xs"
            rootAttributes={{
              role: 'region',
              'aria-label': 'Transitioning Rows',
              'data-vt-row-viewport': '',
            }}
            minHeight={rem(17)}
            maxHeight={rem(17)}
            scrollable
          >
            {each(viewTransitionListRows.value, (row) => (
              <ViewTransitionListRow row={row} />
            ))}
          </List>
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

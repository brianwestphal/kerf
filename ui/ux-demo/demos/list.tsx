import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/tag/tag.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { flex } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListActionRow } from '@kerfjs/ui/list-action-row';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
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

import { DemoContentItem } from './demo-content-item.js';
import { menuToolsOpen } from './state.js';

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
        label="Scrollable application list"
        note="Pane owns the header/content/footer anatomy; the content List owns flex growth, scrolling, and a typed major gap."
      >
        <wa-card appearance="outlined">
          <Pane
            header={
              <Toolbar
                label="Sidebar Toolbar"
                leading={<ToolbarText text="Workspace" size="small" />}
                trailing={
                  <ToolbarControlGroup appearance="borderless" single>
                    <button
                      type="button"
                      aria-label="Add Workspace"
                      data-action="log-add"
                    >
                      <LucideIcon icon={Plus} name="plus" />
                    </button>
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
                    <button
                      type="button"
                      aria-label="Sidebar Settings"
                      data-action="log-settings"
                    >
                      <LucideIcon icon={Settings} name="settings" />
                    </button>
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
                      title="Shared item geometry"
                      detail="The child owns its margin, border, and padding."
                      rootAttributes={{ 'data-content-item': '' }}
                    />
                  </div>
                </List>
              </section>
            </List>
          </Pane>
        </wa-card>
      </CatalogExample>
      <CatalogExample
        label="Shared row dividers"
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
        note="Scope --kui-list-row-padding-inline on a List so ListItem and ListActionRow rows start their leading icons on one edge; it defaults to the 8px item padding."
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
            trailingActionLabel="Project options"
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
        label="Physical-axis alignment"
        note="List keeps its stretch-and-top defaults when omitted; explicit horizontal and vertical alignment use the same vocabulary as Row."
      >
        <wa-card appearance="sunken">
          <List gap="xs" hAlign="right" vAlign="full">
            <wa-tag>Top</wa-tag>
            <wa-tag>Middle</wa-tag>
            <wa-tag>Bottom</wa-tag>
          </List>
        </wa-card>
      </CatalogExample>
      <CatalogExample
        label="Side-selectable insets"
        note="Text insets apply the full 8px + 1px + 8px content geometry; control insets apply 8px, and text wins where both select a side."
      >
        <wa-card appearance="sunken">
          <List gap="xs" textInsets="l" controlInsets="rb">
            <wa-tag>Text-aligned left edge</wa-tag>
            <wa-input label="Inset List Control" value="Control edge" />
            <List textInsets="t">
              <wa-tag>Nested text-aligned top edge</wa-tag>
            </List>
          </List>
        </wa-card>
      </CatalogExample>
      <CatalogExample
        label="Surface behind a strip"
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
            title="Work area"
            detail="The lowered region continues below the strip."
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Document inset"
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
        label="Divider between regions"
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
    </CatalogExampleStack>
  );
}

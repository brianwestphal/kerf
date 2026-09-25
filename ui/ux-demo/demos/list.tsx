import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/tag/tag.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { flex, space } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { CircleHelp, Folder, Inbox, Plus, Settings, Wrench } from 'lucide';

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
      label: 'Drafts without a visible icon',
    },
  ];
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'list' }}>
      <CatalogExample
        label="Scrollable application list"
        note="Pane owns the header/content/footer anatomy; the content List owns flex growth, scrolling, a typed major gap, and a right divider."
      >
        <wa-card appearance="outlined">
          <Pane
            header={
              <Toolbar
                label="Sidebar toolbar"
                dividerSides=""
                leading={<ToolbarText text="Workspace" size="small" />}
                trailing={
                  <ToolbarControlGroup appearance="borderless" single>
                    <button
                      type="button"
                      aria-label="Add workspace"
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
                label="Sidebar footer"
                dividerSides=""
                leading={<ToolbarText text="Ready" size="small" />}
                trailing={
                  <ToolbarControlGroup appearance="borderless" single>
                    <button
                      type="button"
                      aria-label="Sidebar settings"
                      data-action="log-settings"
                    >
                      <LucideIcon icon={Settings} name="settings" />
                    </button>
                  </ToolbarControlGroup>
                }
              />
            }
          >
            <List gap={space('l')} flex={flex(1)} scrollable dividerSides="r">
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
            <wa-input
              label="Inset list control"
              value="Control edge"
            ></wa-input>
            <List textInsets="t">
              <wa-tag>Nested text-aligned top edge</wa-tag>
            </List>
          </List>
        </wa-card>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

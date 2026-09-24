import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { flex, space } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { CircleHelp, Folder, Inbox, Plus, Settings, Wrench } from 'lucide';

import { icon, menuToolsOpen } from './state.js';

export function ListDemo() {
  const workspaceHeading: string | undefined = 'Workspace';
  const workspaceRows = [
    {
      action: 'log-projects',
      itemId: 'projects',
      label: 'Projects',
      icon: icon(Folder, 'folder'),
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
        note="The outer and content stacks use List; the content owns flex growth, scrolling, a typed major gap, and a right divider."
      >
        <List className="demo-list kui-pane">
          <div class="kui-pane__toolbar">
            <Toolbar
              label="Sidebar toolbar"
              dividerSides=""
              leading={
                <ToolbarControlGroup appearance="borderless" single>
                  <ToolbarText text="Workspace" size="small" />
                </ToolbarControlGroup>
              }
              trailing={
                <ToolbarControlGroup appearance="borderless" single>
                  <button
                    type="button"
                    aria-label="Add workspace"
                    data-action="log-add"
                  >
                    {icon(Plus, 'plus')}
                  </button>
                </ToolbarControlGroup>
              }
            />
          </div>
          <List
            className="demo-list__content kui-pane__content kui-content"
            gap={space('l')}
            flex={flex(1)}
            scrollable
            dividerSides="r"
          >
            <section>
              <List>
                {workspaceHeading !== undefined ? (
                  <ListHeader
                    label={workspaceHeading}
                    count={3}
                    countLabel="3 workspaces"
                    action="log-add"
                    actionLabel="Add workspace"
                    actionIcon={icon(Plus, 'plus')}
                  />
                ) : null}
                <ListItem
                  action="log-inbox"
                  itemId="inbox"
                  label="Inbox"
                  icon={icon(Inbox, 'inbox')}
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
                  triggerAttributes={{ 'aria-controls': 'menu-tools-content' }}
                />
                <div id="menu-tools-content" hidden={!menuToolsOpen.value}>
                  <ListItem
                    action="log-settings"
                    label="A multiline item demonstrates content that wraps without clipping"
                    icon={icon(Wrench, 'wrench')}
                    multiline
                  />
                  <ListItem
                    action="disabled"
                    label="Unavailable"
                    icon={icon(CircleHelp, 'circle-help')}
                    disabled
                  />
                  <div class="kui-content-item" data-content-item>
                    <strong>Shared item geometry</strong>
                    <Text variant="p">
                      The child owns its margin, border, and padding.
                    </Text>
                  </div>
                </div>
              </List>
            </section>
          </List>
          <div class="kui-pane__footer">
            <Toolbar
              label="Sidebar footer"
              dividerSides=""
              leading={
                <ToolbarControlGroup appearance="borderless" single>
                  <ToolbarText text="Ready" size="small" />
                </ToolbarControlGroup>
              }
              trailing={
                <ToolbarControlGroup appearance="borderless" single>
                  <button
                    type="button"
                    aria-label="Sidebar settings"
                    data-action="log-settings"
                  >
                    {icon(Settings, 'settings')}
                  </button>
                </ToolbarControlGroup>
              }
            />
          </div>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Physical-axis alignment"
        note="List keeps its stretch-and-top defaults when omitted; explicit horizontal and vertical alignment use the same vocabulary as Row."
      >
        <List
          className="demo-list-alignment"
          gap="xs"
          hAlign="right"
          vAlign="full"
        >
          <span>Top</span>
          <span>Middle</span>
          <span>Bottom</span>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Side-selectable insets"
        note="Text insets apply the full 8px + 1px + 8px content geometry; control insets apply 8px, and text wins where both select a side."
      >
        <List
          className="demo-list-insets"
          gap="xs"
          textInsets="l"
          controlInsets="rb"
        >
          <span>Text-aligned left edge</span>
          <input aria-label="Inset list control" value="Control edge" />
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

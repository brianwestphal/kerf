import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/collapsible-panel.css';

import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '@kerfjs/ui/collapsible-panel';
import { deviceClass } from '@kerfjs/ui/device-class';
import { Grid } from '@kerfjs/ui/grid';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { type SidebarStorage, wireSidebar } from '@kerfjs/ui/wire-sidebar';
import { signal } from 'kerfjs';
import { Bell, Folder, Inbox, Users } from 'lucide';

import type { RecipeFactory, RecipePresentation } from './types.js';

const RAIL_ACTION = 'recipe-sidebar-rail';
const DRAWER_ACTION = 'recipe-sidebar-drawer';

export const presentation: RecipePresentation = {
  viewport: {
    layout: 'grid',
    width: 'full',
    height: 'tall',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: "The app owns each panel's collapsed signal, sizes, and content; wireSidebar owns the toggle, focus move/restore, the compact overlay, and persistence.",
};

/**
 * A memory-backed store so the recipe demonstrates the persistence hook without
 * writing to the shared `localStorage` the catalog page runs in.
 */
function memoryStorage(): SidebarStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

const labels: Record<string, string> = {
  inbox: 'Inbox',
  projects: 'Projects',
  shared: 'Shared with me',
};

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal('inbox');
  const railCollapsed = signal(false);
  const drawerCollapsed = signal(true);
  const storage = memoryStorage();
  // A shared window-backed device class: when the viewport is compact the wire
  // switches the rail/drawer to a dismissable overlay presentation.
  const device = deviceClass();

  const railToggle = () => (
    <CollapsiblePanelToggle
      side="left"
      collapsed={railCollapsed.value}
      action={RAIL_ACTION}
      panelId="sidebar-rail"
      label={railCollapsed.value ? 'Show navigation' : 'Hide navigation'}
    />
  );
  const drawerToggle = () => (
    <CollapsiblePanelToggle
      side="bottom"
      collapsed={drawerCollapsed.value}
      action={DRAWER_ACTION}
      panelId="sidebar-console"
      label={drawerCollapsed.value ? 'Show activity' : 'Hide activity'}
    />
  );

  const rail = () => (
    <CollapsiblePanel
      id="sidebar-rail"
      side="left"
      size={232}
      collapsed={railCollapsed.value}
      label="Workspace navigation"
    >
      <Pane
        contentElement="nav"
        contentLabel="Workspace"
        header={
          <Toolbar
            label="Workspace navigation"
            dividerSides=""
            leading={<ToolbarText text="Atlas" />}
            trailing={
              <ToolbarControlGroup appearance="borderless" single>
                {railToggle()}
              </ToolbarControlGroup>
            }
          />
        }
      >
        <section>
          <ListHeader label="Workspace" />
          <ListItem
            action="recipe-action"
            itemId="inbox"
            label="Inbox"
            icon={<LucideIcon icon={Inbox} name="inbox" />}
            trailing={<span>12</span>}
            selected={selected.value === 'inbox'}
          />
          <ListItem
            action="recipe-action"
            itemId="projects"
            label="Projects"
            icon={<LucideIcon icon={Folder} name="folder" />}
            selected={selected.value === 'projects'}
          />
          <ListItem
            action="recipe-action"
            itemId="shared"
            label="Shared with me"
            icon={<LucideIcon icon={Users} name="users" />}
            selected={selected.value === 'shared'}
          />
        </section>
      </Pane>
    </CollapsiblePanel>
  );

  // The reveal toggle lives in the always-visible main header, so a collapsed
  // rail stays reachable; the panel's own header holds its collapse toggle.
  const main = () => (
    <Pane
      element="main"
      header={
        <Toolbar
          label="Current navigation view"
          dividerSides=""
          leading={
            <>
              <ToolbarControlGroup appearance="borderless" single>
                {railToggle()}
              </ToolbarControlGroup>
              <ToolbarText
                text={labels[selected.value] ?? 'Inbox'}
                size="xlarge"
                id="recipe-collapsible-main-title"
              />
            </>
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              {drawerToggle()}
            </ToolbarControlGroup>
          }
        />
      }
    >
      <div class="kui-content-item">
        <List gap="2xs">
          <Text variant="span">
            <strong>Narrow the window to a compact width</strong>
          </Text>
          <Text variant="span" tone="quiet" size="compact">
            The rail and drawer become a dismissable overlay: a backdrop,
            Escape, and a trapped Tab ring, all managed by the wire.
          </Text>
        </List>
      </div>
    </Pane>
  );

  const drawer = () => (
    <CollapsiblePanel
      id="sidebar-console"
      side="bottom"
      size={168}
      collapsed={drawerCollapsed.value}
      label="Activity"
    >
      <Pane
        header={
          <Toolbar
            label="Activity"
            dividerSides="b"
            leading={<ToolbarText text="Activity" size="small" />}
            trailing={
              <ToolbarControlGroup appearance="borderless" single>
                {drawerToggle()}
              </ToolbarControlGroup>
            }
          />
        }
      >
        <ValueTable label="Recent activity">
          <ValueTableRow
            label="Deploy finished"
            value="2m ago"
            icon={<LucideIcon icon={Bell} name="bell" />}
          />
          <ValueTableRow
            label="Review requested"
            value="9m ago"
            icon={<LucideIcon icon={Bell} name="bell" />}
          />
        </ValueTable>
      </Pane>
    </CollapsiblePanel>
  );

  // The root Pane gives the frame one definite height; its Row fills it with
  // the rail beside a column whose main pane grows above the bottom drawer.
  const render = () => (
    <Pane
      element="section"
      label="Atlas workspace"
      rootAttributes={{
        'data-recipe': 'recipe-collapsible-sidebar',
        'data-rail-collapsed': String(railCollapsed.value),
        'data-drawer-collapsed': String(drawerCollapsed.value),
      }}
    >
      <Row gap="none" flex>
        {rail()}
        <List flex>
          <Grid columns={1} gap="none" flex>
            {main()}
          </Grid>
          {drawer()}
        </List>
      </Row>
    </Pane>
  );

  return {
    render,
    action(command, element) {
      const id = element.dataset.itemId;
      if (id) {
        selected.value = id;
        announce(`Opened ${id}`);
        return;
      }
      announce(`${command} requested`);
    },
    wire(root) {
      return wireSidebar(root, {
        deviceClass: device,
        storage,
        panels: [
          {
            id: 'sidebar-rail',
            collapsed: railCollapsed,
            toggleAction: RAIL_ACTION,
            storageKey: 'recipe-sidebar-rail',
          },
          {
            id: 'sidebar-console',
            collapsed: drawerCollapsed,
            toggleAction: DRAWER_ACTION,
            storageKey: 'recipe-sidebar-console',
          },
        ],
      });
    },
  };
};

import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/floating-toolbar.css';

import {
  CollapsiblePanel,
  CollapsiblePanelRelocated,
  type CollapsiblePanelToolbar,
} from '@kerfjs/ui/collapsible-panel';
import { ContentItem } from '@kerfjs/ui/content-item';
import { deviceClass } from '@kerfjs/ui/device-class';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { Grid } from '@kerfjs/ui/grid';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
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
    width: 'full',
    height: 'app',
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
  // A shared window-backed device class: when the viewport is compact the wire
  // switches the rail/drawer to a dismissable overlay presentation.
  const device = deviceClass();
  // A compact overlay only opens on a user action, so the first render already
  // matches: collapsed on a compact device, open inline otherwise. The wire's
  // `inlineCollapsed` keeps the open inline default for a later wide crossing.
  const railCollapsed = signal(device.value.compact);
  const drawerCollapsed = signal(true);
  const storage = memoryStorage();

  // Each panel composes its own toolbar with the standard toggle last. While a
  // panel is collapsed, CollapsiblePanelRelocated carries that toggle: the
  // rail's leads the main toolbar, the drawer's floats in its container's
  // bottom-end corner. wireSidebar hands focus between the two positions.
  const railToolbar: CollapsiblePanelToolbar = {
    label: 'Workspace navigation',
    title: <ToolbarText text="Atlas" />,
    toggle: { action: RAIL_ACTION, name: 'navigation' },
  };
  const drawerToolbar: CollapsiblePanelToolbar = {
    label: 'Activity',
    title: <ToolbarText text="Activity" size="small" />,
    toggle: { action: DRAWER_ACTION, name: 'activity' },
  };

  const rail = () => (
    <CollapsiblePanel
      id="sidebar-rail"
      side="left"
      size={232}
      collapsed={railCollapsed.value}
      label="Workspace navigation"
      toolbar={railToolbar}
    >
      <nav aria-label="Workspace">
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
      </nav>
    </CollapsiblePanel>
  );

  const main = () => (
    <Pane
      element="main"
      header={
        <Toolbar
          label="Current navigation view"
          dividerSides=""
          leading={
            <>
              <CollapsiblePanelRelocated
                panelId="sidebar-rail"
                side="left"
                collapsed={railCollapsed.value}
                toolbar={railToolbar}
              />
              <ToolbarText
                text={labels[selected.value] ?? 'Inbox'}
                size="xlarge"
                id="recipe-collapsible-main-title"
              />
            </>
          }
        />
      }
    >
      <ContentItem>
        <List gap="2xs">
          <Text variant="span">
            <strong>Narrow the window to a compact width</strong>
          </Text>
          <Text variant="span" tone="quiet" size="compact">
            The rail and drawer start closed and open as a dismissable overlay:
            a backdrop, Escape, and a trapped Tab ring, all managed by the wire.
          </Text>
        </List>
      </ContentItem>
    </Pane>
  );

  const drawer = () => (
    <CollapsiblePanel
      id="sidebar-console"
      side="bottom"
      size={168}
      collapsed={drawerCollapsed.value}
      label="Activity"
      toolbar={drawerToolbar}
      restoreControl={
        <FloatingToolbar label="Activity drawer">
          <CollapsiblePanelRelocated
            panelId="sidebar-console"
            side="bottom"
            collapsed={drawerCollapsed.value}
            toolbar={drawerToolbar}
          />
        </FloatingToolbar>
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
    </CollapsiblePanel>
  );

  // The root Row fills the frame's definite height with the rail beside a
  // column whose main pane grows above the bottom drawer. Each CollapsiblePanel
  // docks to a real frame edge, so it paints through that edge's safe area and
  // hands the edge back to its siblings when it collapses.
  const render = () => (
    <Row
      gap="none"
      fill
      rootAttributes={{
        'data-recipe': 'recipe-collapsible-sidebar',
        'data-rail-collapsed': String(railCollapsed.value),
        'data-drawer-collapsed': String(drawerCollapsed.value),
      }}
    >
      {rail()}
      <List flex>
        <Grid columns={1} gap="none" flex>
          {main()}
        </Grid>
        {drawer()}
      </List>
    </Row>
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
            inlineCollapsed: false,
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

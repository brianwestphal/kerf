import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/collapsible-panel.css';
import './recipes.css';

import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '@kerfjs/ui/collapsible-panel';
import { deviceClass } from '@kerfjs/ui/device-class';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { type SidebarStorage, wireSidebar } from '@kerfjs/ui/wire-sidebar';
import { signal } from 'kerfjs';
import { Bell, Folder, Inbox, Users } from 'lucide';

import type { RecipeFactory } from './types.js';

const RAIL_ACTION = 'recipe-sidebar-rail';
const DRAWER_ACTION = 'recipe-sidebar-drawer';

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

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal('inbox');
  const railCollapsed = signal(false);
  const drawerCollapsed = signal(true);
  const storage = memoryStorage();
  // A shared window-backed device class: when the viewport is compact the wire
  // switches the rail/drawer to a dismissable overlay presentation.
  const device = deviceClass();

  const railToggle = (inPanel: boolean) => (
    <CollapsiblePanelToggle
      side="left"
      collapsed={railCollapsed.value}
      action={RAIL_ACTION}
      panelId="sidebar-rail"
      label={railCollapsed.value ? 'Show navigation' : 'Hide navigation'}
      className={inPanel ? '' : 'recipe-collapsible-sidebar__reveal'}
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

  const render = () => (
    <section
      class="kui-recipe recipe-collapsible-sidebar kui-recipe__surface"
      data-recipe="recipe-collapsible-sidebar"
      data-rail-collapsed={String(railCollapsed.value)}
      data-drawer-collapsed={String(drawerCollapsed.value)}
    >
      <CollapsiblePanel
        id="sidebar-rail"
        side="left"
        size={232}
        collapsed={railCollapsed.value}
        label="Workspace navigation"
        className="recipe-collapsible-sidebar__rail kui-pane"
      >
        <div class="recipe-collapsible-sidebar__rail-head">
          <ToolbarText text="Atlas" />
          <ToolbarControlGroup appearance="borderless" single>
            {railToggle(true)}
          </ToolbarControlGroup>
        </div>
        <nav
          class="recipe-collapsible-sidebar__nav kui-pane__content kui-content"
          aria-label="Workspace"
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
        </nav>
      </CollapsiblePanel>
      <main class="recipe-collapsible-sidebar__main kui-pane">
        <Toolbar
          label="Current navigation view"
          dividerSides=""
          leading={
            <>
              <ToolbarControlGroup appearance="borderless" single>
                {railToggle(false)}
              </ToolbarControlGroup>
              <ToolbarText
                text={
                  selected.value === 'projects'
                    ? 'Projects'
                    : selected.value === 'shared'
                      ? 'Shared with me'
                      : 'Inbox'
                }
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
        <div class="recipe-collapsible-sidebar__body kui-pane__content kui-content">
          <Text variant="p" class="kui-recipe__ownership kui-content-item">
            The app owns each panel's <code>collapsed</code> signal, sizes, and
            content; <code>wireSidebar</code> owns the toggle, focus
            move/restore, the compact overlay, and persistence.
          </Text>
          <article class="recipe-collapsible-sidebar__card kui-content-item">
            <strong>Narrow the window to a compact width</strong>
            <Text variant="p" class="kui-recipe__muted">
              The rail and drawer become a dismissable overlay: a backdrop,
              Escape, and a trapped Tab ring, all managed by the wire.
            </Text>
          </article>
        </div>
      </main>
      <CollapsiblePanel
        id="sidebar-console"
        side="bottom"
        size={168}
        collapsed={drawerCollapsed.value}
        label="Activity"
        className="recipe-collapsible-sidebar__drawer kui-pane"
      >
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
        <div class="recipe-collapsible-sidebar__drawer-body kui-pane__content kui-content">
          <ul class="recipe-collapsible-sidebar__log">
            <li>
              <LucideIcon icon={Bell} name="bell" />
              Deploy finished · 2m ago
            </li>
            <li>
              <LucideIcon icon={Bell} name="bell" />
              Review requested · 9m ago
            </li>
          </ul>
        </div>
      </CollapsiblePanel>
    </section>
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

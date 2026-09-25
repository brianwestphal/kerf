import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/collapsible-panel.css';
import './collapsible-sidebar.css';

import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '@kerfjs/ui/collapsible-panel';
import { deviceClass } from '@kerfjs/ui/device-class';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { type SidebarStorage, wireSidebar } from '@kerfjs/ui/wire-sidebar';
import { signal } from 'kerfjs';
import { Bell, Folder, Inbox, Users } from 'lucide';

import {
  RecipeMutedText,
  RecipeOwnershipNote,
  RecipeRoot,
} from './recipe-root.js';
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
    <RecipeRoot
      recipe="recipe-collapsible-sidebar"
      dataAttributes={{
        'data-rail-collapsed': String(railCollapsed.value),
        'data-drawer-collapsed': String(drawerCollapsed.value),
      }}
    >
      <div class="recipe-collapsible-sidebar">
        <div class="recipe-collapsible-sidebar__rail">
          <CollapsiblePanel
            id="sidebar-rail"
            side="left"
            size={232}
            collapsed={railCollapsed.value}
            label="Workspace navigation"
          >
            <Pane
              contentElement="nav"
              contentClassName="recipe-collapsible-sidebar__nav"
              contentLabel="Workspace"
              header={
                <Toolbar
                  label="Workspace navigation"
                  dividerSides=""
                  leading={<ToolbarText text="Atlas" />}
                  trailing={
                    <ToolbarControlGroup appearance="borderless" single>
                      {railToggle(true)}
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
        </div>
        <div class="recipe-collapsible-sidebar__main">
          <Pane
            element="main"
            contentClassName="recipe-collapsible-sidebar__body"
            header={
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
            }
          >
            <RecipeOwnershipNote>
              The app owns each panel's <code>collapsed</code> signal, sizes,
              and content; <code>wireSidebar</code> owns the toggle, focus
              move/restore, the compact overlay, and persistence.
            </RecipeOwnershipNote>
            <article class="recipe-collapsible-sidebar__card kui-content-item">
              <strong>Narrow the window to a compact width</strong>
              <RecipeMutedText>
                The rail and drawer become a dismissable overlay: a backdrop,
                Escape, and a trapped Tab ring, all managed by the wire.
              </RecipeMutedText>
            </article>
          </Pane>
        </div>
        <div class="recipe-collapsible-sidebar__drawer">
          <CollapsiblePanel
            id="sidebar-console"
            side="bottom"
            size={168}
            collapsed={drawerCollapsed.value}
            label="Activity"
          >
            <Pane
              contentClassName="recipe-collapsible-sidebar__drawer-body"
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
              <ul class="recipe-collapsible-sidebar__log">
                <li>
                  <span class="recipe-collapsible-sidebar__log-icon">
                    <LucideIcon icon={Bell} name="bell" />
                  </span>
                  Deploy finished · 2m ago
                </li>
                <li>
                  <span class="recipe-collapsible-sidebar__log-icon">
                    <LucideIcon icon={Bell} name="bell" />
                  </span>
                  Review requested · 9m ago
                </li>
              </ul>
            </Pane>
          </CollapsiblePanel>
        </div>
      </div>
    </RecipeRoot>
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

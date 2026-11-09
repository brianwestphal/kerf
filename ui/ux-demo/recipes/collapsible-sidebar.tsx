import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/floating-toolbar.css';

import { type CollapsiblePanelToolbar } from '@kerfjs/ui/collapsible-panel';
import { deviceClass } from '@kerfjs/ui/device-class';
import { type SidebarStorage, wireSidebar } from '@kerfjs/ui/wire-sidebar';
import { signal } from 'kerfjs';

import { renderRecipeCollapsibleSidebar } from '../views/recipe-collapsible-sidebar.view.js';
import { renderRecipeSidebarDrawerTitle } from '../views/recipe-sidebar-drawer-title.view.js';
import { renderRecipeSidebarNavHeader } from '../views/recipe-sidebar-nav-header.view.js';
import { renderRecipeSidebarNavInbox } from '../views/recipe-sidebar-nav-inbox.view.js';
import { renderRecipeSidebarNavProjects } from '../views/recipe-sidebar-nav-projects.view.js';
import { renderRecipeSidebarNavShared } from '../views/recipe-sidebar-nav-shared.view.js';
import { renderRecipeSidebarRailTitle } from '../views/recipe-sidebar-rail-title.view.js';
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

/** Memory storage demonstrates persistence without changing the catalog page. */
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
  const device = deviceClass();
  const railCollapsed = signal(device.value.compact);
  const drawerCollapsed = signal(true);
  const storage = memoryStorage();

  const railToolbar: CollapsiblePanelToolbar = {
    label: 'Workspace Navigation',
    title: renderRecipeSidebarRailTitle({}),
    toggle: { action: RAIL_ACTION, name: 'Navigation' },
  };
  const drawerToolbar: CollapsiblePanelToolbar = {
    label: 'Activity',
    title: renderRecipeSidebarDrawerTitle({}),
    toggle: { action: DRAWER_ACTION, name: 'Activity' },
  };

  const render = () => {
    const rail = railCollapsed.value;
    const drawer = drawerCollapsed.value;
    const item = selected.value;
    return renderRecipeCollapsibleSidebar(
      {
        railCollapsed: rail,
        drawerCollapsed: drawer,
        railCollapsedText: String(rail),
        drawerCollapsedText: String(drawer),
        railToolbar,
        railRelocatedToolbar: railToolbar,
        drawerToolbar,
        drawerRelocatedToolbar: drawerToolbar,
        selectedLabel: labels[item] ?? 'Inbox',
      },
      {
        navigation: () => (
          <nav aria-label="Workspace">
            <section>
              {renderRecipeSidebarNavHeader({})}
              {renderRecipeSidebarNavInbox({ selected: item === 'inbox' })}
              {renderRecipeSidebarNavProjects({
                selected: item === 'projects',
              })}
              {renderRecipeSidebarNavShared({ selected: item === 'shared' })}
            </section>
          </nav>
        ),
      },
    );
  };

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

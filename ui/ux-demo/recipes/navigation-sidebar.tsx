import '@kerfjs/ui/layout.css';
import './recipes.css';

import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { signal } from 'kerfjs';
import { Folder, Inbox, Plus, Settings, Users } from 'lucide';

import type { RecipeFactory } from './types.js';

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal('inbox');
  const expanded = signal(true);
  const render = () => (
    <Pane
      element="aside"
      className="kui-recipe recipe-sidebar kui-recipe__surface"
      contentClassName="recipe-sidebar__body"
      rootAttributes={{ 'data-recipe': 'recipe-navigation-sidebar' }}
      footer={
        <Toolbar
          label="Sidebar actions"
          dividerSides=""
          leading={
            <ToolbarControlGroup appearance="borderless" single>
              <button
                type="button"
                aria-label="Add project"
                data-action="recipe-action"
                data-recipe-command="add"
              >
                <LucideIcon icon={Plus} name="plus" />
              </button>
            </ToolbarControlGroup>
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <button
                type="button"
                aria-label="Workspace settings"
                data-action="recipe-action"
                data-recipe-command="settings"
              >
                <LucideIcon icon={Settings} name="settings" />
              </button>
            </ToolbarControlGroup>
          }
        />
      }
    >
      <section>
        <ListHeader
          label="Workspace"
          count={3}
          countLabel="3 workspaces"
          action="recipe-action"
          actionLabel="Add workspace item"
          actionIcon={<LucideIcon icon={Plus} name="plus" />}
        />
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
          itemId="shared"
          label="Shared with me"
          icon={<LucideIcon icon={Users} name="users" />}
          selected={selected.value === 'shared'}
        />
        <ListItem
          action="recipe-action"
          itemId="drafts"
          label="Drafts without an icon"
          selected={selected.value === 'drafts'}
        />
      </section>
      <section>
        <ListHeader
          label="Projects"
          toggle
          action="recipe-action"
          expanded={expanded.value}
        />
        {expanded.value && (
          <>
            <ListItem
              action="recipe-action"
              itemId="design"
              label="Design system rollout across desktop and tablet"
              icon={<LucideIcon icon={Folder} name="folder" />}
              selected={selected.value === 'design'}
              multiline
            />
            <ListItem
              action="recipe-action"
              itemId="archive"
              label="Archived"
              disabled
              title="Available to administrators"
            />
            <div class="kui-content-item">
              <strong>Quarterly goal</strong>
              <Text class="kui-recipe__muted">
                Ship accessible navigation patterns to every workspace.
              </Text>
            </div>
          </>
        )}
      </section>
      <Text class="kui-recipe__ownership kui-content-item">
        The recipe owns pane, content-item, and toolbar geometry. The app owns
        routes, permissions, labels, and disclosure state.
      </Text>
    </Pane>
  );
  return {
    render,
    action(command, element) {
      if (element.matches('.kui-list-header__toggle')) {
        expanded.value = !expanded.value;
        announce(expanded.value ? 'Projects expanded' : 'Projects collapsed');
        return;
      }
      const id = element.dataset.itemId;
      if (id) selected.value = id;
      announce(id ? `Selected ${id}` : `${command} requested`);
    },
  };
};

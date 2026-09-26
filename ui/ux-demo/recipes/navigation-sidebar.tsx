import '@kerfjs/ui/layout.css';

import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { signal } from 'kerfjs';
import { Folder, Inbox, Plus, Settings, Users } from 'lucide';

import type { RecipeFactory, RecipePresentation } from './types.js';

export const presentation: RecipePresentation = {
  viewport: {
    layout: 'grid',
    width: 'compact',
    minHeight: 'medium',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: 'The recipe owns pane, content-item, and toolbar geometry. The app owns routes, permissions, labels, and disclosure state.',
};

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal('inbox');
  const expanded = signal(true);
  const render = () => (
    <Pane
      element="aside"
      label="Workspace navigation"
      rootAttributes={{ 'data-recipe': 'recipe-navigation-sidebar' }}
      footer={
        <Toolbar
          label="Sidebar actions"
          dividerSides="t"
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
              <List gap="2xs">
                <Text variant="span">
                  <strong>Quarterly goal</strong>
                </Text>
                <Text variant="span" tone="quiet" size="compact">
                  Ship accessible navigation patterns to every workspace.
                </Text>
              </List>
            </div>
          </>
        )}
      </section>
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

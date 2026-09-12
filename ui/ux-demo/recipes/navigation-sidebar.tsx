import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/sidebar.css';
import './recipes.css';

import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { MenuHeader } from '@kerfjs/ui/menu-header';
import { MenuItem } from '@kerfjs/ui/menu-item';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { signal } from 'kerfjs';
import { ChevronDown, Folder, Inbox, Plus, Settings, Users } from 'lucide';

import type { RecipeFactory } from './types.js';

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal('inbox');
  const expanded = signal(true);
  const render = () => <aside class="kui-recipe recipe-sidebar kui-recipe__surface kui-layout" data-recipe="recipe-navigation-sidebar">
    <div class="recipe-sidebar__body kui-sidebar kui-scroll-owner kui-pane-body">
      <section class="kui-sidebar-section"><MenuHeader label="Workspace" /><MenuItem action="recipe-action" itemId="inbox" label="Inbox" icon={<LucideIcon icon={Inbox} name="inbox" />} trailing={<span>12</span>} selected={selected.value === 'inbox'} /><MenuItem action="recipe-action" itemId="shared" label="Shared with me" icon={<LucideIcon icon={Users} name="users" />} selected={selected.value === 'shared'} /><MenuItem action="recipe-action" itemId="drafts" label="Drafts without an icon" selected={selected.value === 'drafts'} /></section>
      <section class="kui-sidebar-section"><MenuHeader label="Projects" toggle action="recipe-action" expanded={expanded.value} actionIcon={<LucideIcon icon={ChevronDown} name="chevron-down" />} />{expanded.value && <><MenuItem action="recipe-action" itemId="design" label="Design system rollout across desktop and tablet" icon={<LucideIcon icon={Folder} name="folder" />} selected={selected.value === 'design'} multiline /><MenuItem action="recipe-action" itemId="archive" label="Archived" disabled title="Available to administrators" /><div class="kui-sidebar-surface"><strong>Quarterly goal</strong><p class="kui-recipe__muted">Ship accessible navigation patterns to every workspace.</p></div></>}</section>
      <p class="kui-recipe__ownership">The recipe owns one gutter and label column. The app owns routes, permissions, labels, and disclosure state.</p>
    </div>
    <footer class="recipe-sidebar__footer"><Toolbar label="Sidebar actions" divider={false} leading={<ToolbarControlGroup appearance="borderless" single><button type="button" aria-label="Add project" data-action="recipe-action" data-recipe-command="add"><LucideIcon icon={Plus} name="plus" /></button></ToolbarControlGroup>} trailing={<ToolbarControlGroup appearance="borderless" single><button type="button" aria-label="Workspace settings" data-action="recipe-action" data-recipe-command="settings"><LucideIcon icon={Settings} name="settings" /></button></ToolbarControlGroup>} /></footer>
  </aside>;
  return { render, action(command, element) { if (element.matches('.kui-menu-header--toggle')) { expanded.value = !expanded.value; announce(expanded.value ? 'Projects expanded' : 'Projects collapsed'); return; } const id = element.dataset.itemId; if (id) selected.value = id; announce(id ? `Selected ${id}` : `${command} requested`); } };
};

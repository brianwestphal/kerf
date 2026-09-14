import '@kerfjs/ui/layout.css';
import './recipes.css';

import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { MenuHeader } from '@kerfjs/ui/menu-header';
import { MenuItem } from '@kerfjs/ui/menu-item';
import { PageHeader } from '@kerfjs/ui/page-header';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { Bell, Folder, Inbox, Settings } from 'lucide';

import type { RecipeFactory } from './types.js';

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal('inbox');
  const navigationSize = signal(224);
  const inspectorSize = signal(240);
  const render = () => <section class="kui-recipe recipe-shell kui-recipe__surface kui-layout" data-recipe="recipe-app-shell">
    <Toolbar label="Atlas workspace" leading={<ToolbarControlGroup appearance="borderless" single><ToolbarText text="Atlas" /></ToolbarControlGroup>} trailing={<ToolbarControlGroup appearance="borderless" label="Workspace controls"><button type="button" aria-label="Notifications" data-action="recipe-action" data-recipe-command="notify"><LucideIcon icon={Bell} name="bell" /></button><button type="button" aria-label="Settings" data-action="recipe-action" data-recipe-command="settings"><LucideIcon icon={Settings} name="settings" /></button></ToolbarControlGroup>} />
    <div class="recipe-shell__body">
      <div class="recipe-shell__nav-region"><ResizableRegion id="recipe-navigation" label="Navigation" size={navigationSize.value} min={180} max={320}><aside class="recipe-shell__nav kui-pane"><MenuHeader label="Workspace" /><nav class="recipe-shell__nav-list kui-pane__content kui-content" aria-label="Workspace"><section><MenuItem action="recipe-action" itemId="inbox" label="Inbox" icon={<LucideIcon icon={Inbox} name="inbox" />} selected={selected.value === 'inbox'} /><MenuItem action="recipe-action" itemId="projects" label="Projects with a deliberately wrapping title" icon={<LucideIcon icon={Folder} name="folder" />} selected={selected.value === 'projects'} multiline /></section></nav></aside></ResizableRegion></div>
      <main class="recipe-shell__main kui-pane"><PageHeader title={selected.value === 'inbox' ? 'Inbox triage' : 'Active projects'} action={<button class="kui-recipe__button" data-primary="true" type="button" data-action="recipe-action" data-recipe-command="new">New task</button>} /><div class="recipe-shell__main-body kui-pane__content kui-content"><p class="kui-recipe__ownership kui-content-item">Recipe owns pane geometry and one scroll owner per pane. The app owns routing, data, pane visibility, sizes, and persistence.</p><div class="recipe-shell__cards">{['Release accessibility audit', 'Prepare tablet navigation', 'Review stale-data states', 'Confirm package boundaries'].map((title) => <article class="recipe-shell__card kui-content-item"><strong>{title}</strong><p class="kui-recipe__muted">Assigned to the interface systems team · due this week</p></article>)}</div></div></main>
      <div class="recipe-shell__inspector-region"><ResizableRegion id="recipe-inspector" label="Inspector" size={inspectorSize.value} min={200} max={360} edge="start"><aside class="recipe-shell__inspector kui-pane"><PageHeader title="Inspector" /><div class="recipe-shell__inspector-body kui-pane__content kui-content"><ValueTable label="Selected task"><div><dt>Status</dt><dd>In review</dd></div><div><dt>Owner</dt><dd>Mara Chen</dd></div><div><dt>Priority</dt><dd>High</dd></div></ValueTable></div></aside></ResizableRegion></div>
    </div>
  </section>;
  return { render, action(command, element) { const id = element.dataset.itemId; if (id) selected.value = id; announce(id ? `Opened ${id}` : command === 'new' ? 'New task requested' : `${command} requested`); }, resize(id, size) { if (id === 'recipe-navigation') navigationSize.value = size; if (id === 'recipe-inspector') inspectorSize.value = size; announce(`${id} resized to ${size}px`); } };
};

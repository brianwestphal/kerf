import { describe, expect, it } from 'vitest';

import { createRecipe as createAppShell } from '../../ux-demo/recipes/app-shell.js';
import { createRecipe as createCompactToolbar } from '../../ux-demo/recipes/compact-toolbar.js';
import { createRecipe as createComposerForm } from '../../ux-demo/recipes/composer-form.js';
import { createRecipe as createListWorkspace } from '../../ux-demo/recipes/list-workspace-states.js';
import { createRecipe as createMasterDetail } from '../../ux-demo/recipes/master-detail-dialog.js';
import { createRecipe as createNavigationSidebar } from '../../ux-demo/recipes/navigation-sidebar.js';
import { createRecipe as createWorkspaceHeader } from '../../ux-demo/recipes/workspace-header.js';

const html = (value: { toString(): string }) => value.toString();
const target = (data: Record<string, string> = {}) => {
  const element = document.createElement('button');
  Object.assign(element.dataset, data);
  return element;
};

describe('production composition recipes', () => {
  it('renders every stable recipe marker from a per-instance factory', () => {
    const factories = [createAppShell, createNavigationSidebar, createWorkspaceHeader, createMasterDetail, createComposerForm, createListWorkspace, createCompactToolbar];
    const ids = ['recipe-app-shell', 'recipe-navigation-sidebar', 'recipe-workspace-header', 'recipe-master-detail-dialog', 'recipe-composer-form', 'recipe-list-workspace-states', 'recipe-compact-toolbar'];
    factories.forEach((factory, index) => expect(html(factory(() => {}).render())).toContain(`data-recipe="${ids[index]}"`));
  });

  it('keeps one scroll owner for each application-shell pane and updates controlled resize state', () => {
    const recipe = createAppShell(() => {});
    expect(html(recipe.render()).match(/kui-scroll-owner/g)).toHaveLength(3);
    recipe.resize?.('recipe-navigation', 288);
    expect(html(recipe.render())).toContain('--kui-resizable-region-size:288px');
  });

  it('moves through every list workspace state deterministically', () => {
    const recipe = createListWorkspace(() => {});
    expect(html(recipe.render())).toContain('data-list-state="loading"');
    for (const [command, state] of [['load', 'populated'], ['refresh', 'stale'], ['finish', 'populated'], ['empty', 'empty'], ['create', 'populated'], ['fail', 'error'], ['retry', 'populated']] as const) {
      recipe.action(command, target());
      expect(html(recipe.render())).toContain(`data-list-state="${state}"`);
    }
  });

  it('controls sidebar disclosure, dialog selection, form validation, and toolbar choices', () => {
    const sidebar = createNavigationSidebar(() => {});
    const toggle = target(); toggle.className = 'kui-menu-header--toggle';
    sidebar.action('', toggle);
    expect(html(sidebar.render())).not.toContain('Design system rollout');

    const dialog = createMasterDetail(() => {});
    dialog.action('', target({ itemId: 'gamma' }));
    expect(html(dialog.render())).toContain('Inez Okafor');

    const form = createComposerForm(() => {});
    form.action('submit', target());
    expect(html(form.render())).toContain('role="alert"');
    const input = document.createElement('wa-input') as HTMLElement & { value: string }; input.setAttribute('name', 'recipe-title'); input.value = 'Shipped';
    form.change?.(input); form.action('submit', target());
    expect(html(form.render())).toContain('Update published');

    const toolbar = createCompactToolbar(() => {});
    toolbar.action('filter', target());
    expect(html(toolbar.render())).toContain('aria-pressed="true"');
    toolbar.action('', target({ segmentValue: 'board' }));
    expect(html(toolbar.render())).toContain('data-value="board"');
  });
});

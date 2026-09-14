import { describe, expect, it } from 'vitest';

import { mountCommandPaletteAdapter } from '../../docs/examples/command-palette-adapter.js';
import { createRecipe as createAppShell } from '../../ux-demo/recipes/app-shell.js';
import { createRecipe as createCommandPalette } from '../../ux-demo/recipes/command-palette.js';
import { createRecipe as createCompactToolbar } from '../../ux-demo/recipes/compact-toolbar.js';
import { createRecipe as createComposerForm } from '../../ux-demo/recipes/composer-form.js';
import { createRecipe as createListWorkspace } from '../../ux-demo/recipes/list-workspace-states.js';
import { createRecipe as createMasterDetail } from '../../ux-demo/recipes/master-detail-dialog.js';
import { mountRecipe } from '../../ux-demo/recipes/mount-recipe.js';
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
    const factories = [createAppShell, createNavigationSidebar, createWorkspaceHeader, createMasterDetail, createComposerForm, createListWorkspace, createCompactToolbar, createCommandPalette];
    const ids = ['recipe-app-shell', 'recipe-navigation-sidebar', 'recipe-workspace-header', 'recipe-master-detail-dialog', 'recipe-composer-form', 'recipe-list-workspace-states', 'recipe-compact-toolbar', 'recipe-command-palette'];
    factories.forEach((factory, index) => expect(html(factory(() => {}).render())).toContain(`data-recipe="${ids[index]}"`));
  });

  it('keeps one scroll owner for each application-shell pane and updates controlled resize state', () => {
    const recipe = createAppShell(() => {});
    expect(html(recipe.render()).match(/kui-pane__content/g)).toHaveLength(3);
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
    const toggle = target(); toggle.className = 'kui-menu-header__toggle';
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

  it('mounts copyable recipe wiring at one stable root and disposes every listener', () => {
    const announcements: string[] = [];
    const root = document.createElement('div');
    document.body.append(root);
    const recipe = createNavigationSidebar((message) => announcements.push(message));
    const stop = mountRecipe(root, recipe);

    root.querySelector<HTMLElement>('[data-item-id="shared"] .kui-menu-item__label')?.click();
    expect(root.querySelector('[data-item-id="shared"]')?.getAttribute('aria-current')).toBe('page');
    expect(announcements).toContain('Selected shared');

    stop();
    stop();
    root.querySelector<HTMLElement>('[data-recipe-command="settings"]')?.click();
    expect(announcements).toHaveLength(1);
    root.remove();
  });

  it('keeps the missing command-palette concept application-local and disposable', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const runs: string[] = [];
    let closes = 0;
    const stop = mountCommandPaletteAdapter(root, [
      { id: 'open', label: 'Open project', keywords: ['workspace'] },
      { id: 'publish', label: 'Publish update' },
    ], {
      onClose: () => { closes += 1; },
      onRun: ({ id }) => runs.push(id),
    });

    expect(root.querySelector('.kui-content')).not.toBeNull();
    expect(root.querySelector('.kui-content-item')).not.toBeNull();
    expect(root.querySelector('.kui-control-cluster')).not.toBeNull();
    const query = root.querySelector<HTMLInputElement>('[data-command-query]')!;
    query.value = 'publish';
    query.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(root.textContent).toContain('1 matching commands');
    root.querySelector<HTMLElement>('[data-command-id="publish"]')?.click();
    expect(runs).toEqual(['publish']);
    query.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    expect(closes).toBe(1);

    stop();
    stop();
    root.querySelector<HTMLElement>('[data-action="close-palette"]')?.click();
    expect(closes).toBe(1);
    root.remove();
  });

  it('runs the command-palette recipe through copyable input and keyboard wiring', () => {
    const announcements: string[] = [];
    const root = document.createElement('div');
    document.body.append(root);
    const stop = mountRecipe(root, createCommandPalette((message) => announcements.push(message)));

    const launcher = root.querySelector<HTMLButtonElement>('[data-recipe-command="open"]')!;
    launcher.click();
    const query = root.querySelector<HTMLInputElement>('[data-command-query]')!;
    expect(query.getAttribute('aria-activedescendant')).toBe('recipe-command-option-0');
    expect(root.textContent).toContain('Recent commands');

    query.value = 'settings';
    query.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(root.querySelectorAll('[role="option"]')).toHaveLength(1);
    query.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    expect(announcements).toContain('Ran Open workspace settings');

    root.querySelector('wa-dialog')?.dispatchEvent(new Event('wa-after-hide', { bubbles: true }));
    expect(launcher).toBe(document.activeElement);
    stop();
    root.remove();
  });

  it('forwards the public resize onCommit shape through the copyable adapter', () => {
    const announcements: string[] = [];
    const root = document.createElement('div');
    document.body.append(root);
    const stop = mountRecipe(root, createAppShell((message) => announcements.push(message)));
    const separator = root.querySelector<HTMLElement>('[aria-label="Resize Navigation"]')!;
    separator.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
    expect(separator.getAttribute('aria-valuenow')).toBe('240');
    expect(announcements).toContain('recipe-navigation resized to 240px');
    stop();
    root.remove();
  });
});

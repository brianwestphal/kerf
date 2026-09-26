import { describe, expect, it } from 'vitest';

import { mountCommandPaletteAdapter } from '../../docs/examples/command-palette-adapter.js';
import { createRecipe as createAppShell } from '../../ux-demo/recipes/app-shell.js';
import { createRecipe as createCollapsibleSidebar } from '../../ux-demo/recipes/collapsible-sidebar.js';
import { createRecipe as createCompactToolbar } from '../../ux-demo/recipes/compact-toolbar.js';
import { createRecipe as createComposerForm } from '../../ux-demo/recipes/composer-form.js';
import { createRecipe as createMasterDetail } from '../../ux-demo/recipes/list-detail-dialog.js';
import { createRecipe as createListWorkspace } from '../../ux-demo/recipes/list-workspace-states.js';
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
    const factories = [
      createAppShell,
      createNavigationSidebar,
      createWorkspaceHeader,
      createMasterDetail,
      createComposerForm,
      createListWorkspace,
      createCompactToolbar,
    ];
    const ids = [
      'recipe-app-shell',
      'recipe-navigation-sidebar',
      'recipe-workspace-header',
      'recipe-list-detail-dialog',
      'recipe-composer-form',
      'recipe-list-workspace-states',
      'recipe-compact-toolbar',
    ];
    factories.forEach((factory, index) =>
      expect(html(factory(() => {}).render())).toContain(
        `data-recipe="${ids[index]}"`,
      ),
    );
  });

  it('keeps one scroll owner for each application-shell pane and updates controlled resize state', () => {
    const recipe = createAppShell(() => {});
    const template = document.createElement('template');
    template.innerHTML = html(recipe.render());
    // The shell root is a filling List, not a frame Pane wrapping a scroll
    // owner that never scrolls: only the three real panes own scrolling.
    const root = template.content.firstElementChild!;
    expect(root.getAttribute('data-component')).toBe('list');
    expect(root.getAttribute('data-fill')).toBe('true');
    expect(root.getAttribute('data-recipe')).toBe('recipe-app-shell');
    const panes = [
      ...template.content.querySelectorAll('[data-component="pane"]'),
    ];
    expect(panes.map((pane) => pane.id)).toEqual([
      'recipe-shell-navigation',
      'recipe-shell-content',
      'recipe-shell-inspector',
    ]);
    for (const pane of panes)
      expect(pane.querySelectorAll(':scope > .kui-pane__content')).toHaveLength(
        1,
      );
    recipe.resize?.('recipe-navigation', 288);
    expect(html(recipe.render())).toContain(
      '--kui-resizable-region-size:288px',
    );
  });

  it('moves through every list workspace state deterministically', () => {
    const recipe = createListWorkspace(() => {});
    expect(html(recipe.render())).toContain('data-list-state="loading"');
    for (const [command, state] of [
      ['load', 'populated'],
      ['refresh', 'stale'],
      ['finish', 'populated'],
      ['empty', 'empty'],
      ['create', 'populated'],
      ['fail', 'error'],
      ['retry', 'populated'],
    ] as const) {
      recipe.action(command, target());
      expect(html(recipe.render())).toContain(`data-list-state="${state}"`);
    }
  });

  it('controls sidebar disclosure, dialog selection, form validation, and toolbar choices', () => {
    const sidebar = createNavigationSidebar(() => {});
    const toggle = target();
    toggle.className = 'kui-list-header__toggle';
    sidebar.action('', toggle);
    expect(html(sidebar.render())).not.toContain('Design system rollout');

    const dialog = createMasterDetail(() => {});
    dialog.action('', target({ itemId: 'gamma' }));
    expect(html(dialog.render())).toContain('Inez Okafor');

    const form = createComposerForm(() => {});
    form.action('submit', target());
    expect(html(form.render())).toContain('role="alert"');
    const input = document.createElement('wa-input') as HTMLElement & {
      value: string;
    };
    input.setAttribute('name', 'recipe-title');
    input.value = 'Shipped';
    form.change?.(input);
    form.action('submit', target());
    expect(html(form.render())).toContain('Update published');

    const toolbar = createCompactToolbar(() => {});
    toolbar.action('filter', target());
    expect(html(toolbar.render())).toContain('aria-pressed="true"');
    toolbar.action('', target({ segmentValue: 'board' }));
    expect(html(toolbar.render())).toContain('data-value="board"');
  });

  it('wraps the compact toolbar independent action in single-control geometry', () => {
    const markup = html(createCompactToolbar(() => {}).render());
    const template = document.createElement('template');
    template.innerHTML = markup;
    const more = template.content.querySelector<HTMLButtonElement>(
      '[data-recipe-command="more"]',
    );
    expect(more?.classList.length).toBe(0);
    expect(more?.parentElement?.getAttribute('data-component')).toBe(
      'toolbar-control-group',
    );
    expect(more?.parentElement?.getAttribute('data-single')).toBe('true');
    expect(more?.parentElement?.getAttribute('aria-label')).toBe(
      'More task actions',
    );
  });

  it('gives the composer toolbar heading and direct shared-gutter controls', () => {
    const form = createComposerForm(() => {});
    const template = document.createElement('template');
    template.innerHTML = html(form.render());
    const root = template.content.querySelector<HTMLFormElement>(
      '[data-recipe="recipe-composer-form"]',
    )!;
    // The form carries no styling hook: one List owns its 24px major rhythm.
    expect(root.tagName).toBe('FORM');
    expect(root.getAttribute('class')).toBeNull();
    const stack = root.querySelector<HTMLElement>(':scope > .kui-list')!;
    expect(stack.dataset.gap).toBe('true');
    expect(root.getAttribute('aria-labelledby')).toBe('recipe-composer-title');
    expect(root.getAttribute('aria-describedby')).toBe(
      'recipe-composer-summary',
    );
    expect(
      stack.querySelector(':scope > .kui-list > [data-component="toolbar"]'),
    ).not.toBeNull();
    expect(root.querySelector('#recipe-composer-title')?.textContent).toBe(
      'Publish workspace update',
    );
    expect(root.querySelector('#recipe-composer-summary')?.textContent).toBe(
      'Share a concise, actionable update with collaborators.',
    );
    expect(
      root.querySelector('#recipe-composer-summary')?.parentElement?.dataset
        .component,
    ).toBe('list-inset-text');
    // Heading group, field stack, and action row; no card-like content items.
    expect([...stack.children].map((child) => child.className)).toEqual([
      'kui-list',
      'kui-list',
      'kui-row',
    ]);
    expect(root.querySelectorAll('.kui-content-item')).toHaveLength(0);
    expect(root.querySelector('[data-component="state-banner"]')).toBeNull();
    expect(
      stack.querySelector(':scope > .kui-row [data-recipe-command="submit"]'),
    ).not.toBeNull();

    form.action('submit', target());
    template.innerHTML = html(form.render());
    const errorRoot = template.content.querySelector<HTMLFormElement>(
      '[data-recipe="recipe-composer-form"]',
    )!;
    const banner = errorRoot.querySelector('[data-component="state-banner"]');
    const errorStack = errorRoot.querySelector(':scope > .kui-list');
    expect(banner?.parentElement).toBe(errorStack);
    expect(banner?.getAttribute('role')).toBe('alert');
    expect(errorStack?.children).toHaveLength(4);
  });

  it('resets the composer signals and upgraded field values together', () => {
    const announcements: string[] = [];
    const form = document.createElement('div');
    form.dataset.recipe = 'recipe-composer-form';
    const title = document.createElement('input');
    title.name = 'recipe-title';
    const body = document.createElement('textarea');
    body.name = 'recipe-body';
    const reset = document.createElement('button');
    form.append(title, body, reset);
    const recipe = createComposerForm((message) => announcements.push(message));

    title.value = 'Tablet navigation shipped';
    recipe.change?.(title);
    body.value = 'Updated draft content';
    recipe.change?.(body);
    recipe.action('submit', reset);
    expect(html(recipe.render())).toContain('Update published');

    recipe.action('reset', reset);
    expect(title.value).toBe('');
    expect(body.value).toBe('');
    const resetMarkup = html(recipe.render());
    expect(resetMarkup).toContain('name="recipe-title"');
    expect(resetMarkup).toContain('name="recipe-body"');
    expect(resetMarkup).not.toContain('Updated draft content');
    expect(resetMarkup).not.toContain('Update published');
    const template = document.createElement('template');
    template.innerHTML = resetMarkup;
    expect(
      template.content.querySelector('wa-input')?.getAttribute('value'),
    ).toBe('');
    expect(
      template.content.querySelector('wa-textarea')?.getAttribute('value'),
    ).toBe('');
    expect(announcements.at(-1)).toBe('Draft reset');
  });

  it('mounts copyable recipe wiring at one stable root and disposes every listener', () => {
    const announcements: string[] = [];
    const root = document.createElement('div');
    document.body.append(root);
    const recipe = createNavigationSidebar((message) =>
      announcements.push(message),
    );
    const stop = mountRecipe(root, recipe);

    root
      .querySelector<HTMLElement>(
        '[data-item-id="shared"] .kui-list-item__label',
      )
      ?.click();
    expect(
      root
        .querySelector('[data-item-id="shared"]')
        ?.getAttribute('aria-current'),
    ).toBe('page');
    expect(announcements).toContain('Selected shared');

    stop();
    stop();
    root
      .querySelector<HTMLElement>('[data-recipe-command="settings"]')
      ?.click();
    expect(announcements).toHaveLength(1);
    root.remove();
  });

  it('wires the collapsible sidebar so a toggle collapses its panel and disposes', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const recipe = createCollapsibleSidebar(() => {});
    const markup = html(recipe.render());
    expect(markup).toContain('data-recipe="recipe-collapsible-sidebar"');
    // A filling Row is the root; no frame Pane wraps the layout.
    expect(markup).toMatch(
      /^<div data-recipe="recipe-collapsible-sidebar"[^>]*class="kui-row"[^>]*data-fill="true"/,
    );
    const stop = mountRecipe(root, recipe);

    const rail = root.querySelector('[data-collapsible-panel="sidebar-rail"]')!;
    expect(rail.getAttribute('data-collapsed')).toBe('false');
    // One control owns each action: the rail's own collapse toggle while it is
    // open, the main header's expand toggle only while it is collapsed.
    const reveal = () =>
      root.querySelector<HTMLButtonElement>(
        'main [data-collapsible-target="sidebar-rail"]',
      );
    const collapseToggle = () =>
      rail.querySelector<HTMLButtonElement>(
        '[data-collapsible-target="sidebar-rail"]',
      )!;
    expect(reveal()).toBeNull();
    collapseToggle().click();
    expect(rail.getAttribute('data-collapsed')).toBe('true');
    expect(document.activeElement).toBe(reveal());
    reveal()!.click();
    expect(rail.getAttribute('data-collapsed')).toBe('false');
    expect(reveal()).toBeNull();

    stop();
    stop();
    collapseToggle().click();
    // After disposal the toggle no longer flips the panel.
    expect(rail.getAttribute('data-collapsed')).toBe('false');
    root.remove();
  });

  it('keeps the missing command-palette concept application-local and disposable', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const runs: string[] = [];
    let closes = 0;
    const stop = mountCommandPaletteAdapter(
      root,
      [
        { id: 'open', label: 'Open project', keywords: ['workspace'] },
        { id: 'publish', label: 'Publish update' },
      ],
      {
        onClose: () => {
          closes += 1;
        },
        onRun: ({ id }) => runs.push(id),
      },
    );

    expect(root.querySelector('.kui-content')).not.toBeNull();
    expect(root.querySelector('.kui-content-item')).not.toBeNull();
    expect(root.querySelector('.kui-control-cluster')).not.toBeNull();
    const query = root.querySelector<HTMLInputElement>('[data-command-query]')!;
    query.value = 'publish';
    query.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(root.textContent).toContain('1 matching commands');
    root.querySelector<HTMLElement>('[data-command-id="publish"]')?.click();
    expect(runs).toEqual(['publish']);
    query.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    );
    expect(closes).toBe(1);

    stop();
    stop();
    root.querySelector<HTMLElement>('[data-action="close-palette"]')?.click();
    expect(closes).toBe(1);
    root.remove();
  });

  it('forwards the public resize onCommit shape through the copyable adapter', () => {
    const announcements: string[] = [];
    const root = document.createElement('div');
    document.body.append(root);
    const stop = mountRecipe(
      root,
      createAppShell((message) => announcements.push(message)),
    );
    const separator = root.querySelector<HTMLElement>(
      '[aria-label="Resize Navigation"]',
    )!;
    separator.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    );
    expect(separator.getAttribute('aria-valuenow')).toBe('240');
    expect(announcements).toContain('recipe-navigation resized to 240px');
    stop();
    root.remove();
  });
});

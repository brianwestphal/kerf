import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/select/register';

import { deviceClass } from '@kerfjs/ui/device-class';
import { signal } from 'kerfjs';

import { renderRecipeCompactToolbar } from '../views/recipe-compact-toolbar.view.js';
import type { RecipeFactory, RecipePresentation } from './types.js';

export const presentation: RecipePresentation = {
  viewport: {
    width: 'full',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: 'The recipe owns control semantics and wrapping. The app owns values, actions, persistence, and responsive priority.',
};

export const createRecipe: RecipeFactory = (announce) => {
  const view = signal<'list' | 'board' | 'timeline'>('list');
  const sort = signal<'updated' | 'priority' | 'owner' | 'created'>('updated');
  const filtered = signal(false);
  const device = deviceClass();
  const render = () => (
    <section data-recipe="recipe-compact-toolbar" aria-label="Task Workspace">
      {renderRecipeCompactToolbar({
        view: view.value,
        sort: sort.value,
        filtered: filtered.value,
        columns: device.value.compact
          ? 1
          : device.value.atLeast('desktop')
            ? 4
            : 2,
      })}
    </section>
  );
  return {
    render,
    action(command, element) {
      const value = element.dataset.segmentValue;
      if (value === 'list' || value === 'board' || value === 'timeline')
        view.value = value;
      if (command === 'filter') filtered.value = !filtered.value;
      announce(
        value
          ? `View: ${value}`
          : command === 'filter'
            ? `Filters ${filtered.value ? 'on' : 'off'}`
            : `${command} requested`,
      );
    },
    change(element) {
      const value = (element as HTMLElement & { value?: string }).value;
      if (
        element.getAttribute('name') === 'recipe-sort' &&
        (value === 'updated' ||
          value === 'priority' ||
          value === 'owner' ||
          value === 'created')
      ) {
        sort.value = value;
        announce(`Sort: ${value}`);
      }
    },
  };
};

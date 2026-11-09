import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/select/register';
import '@kerfjs/ui/webawesome.css';

import { signal } from 'kerfjs';

import { renderRecipeComposerForm } from '../views/recipe-composer-form.view.js';
import type { RecipeFactory, RecipePresentation } from './types.js';

export const presentation: RecipePresentation = {
  viewport: {
    width: 'medium',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: 'The recipe owns field, message, and action rhythm. The app owns validation rules, draft persistence, permissions, and transport.',
};

type ValueField = HTMLElement & { value: string };

const syncControlledFieldValues = (
  action: HTMLElement,
  values: Record<string, string>,
) => {
  const form = action.closest<HTMLElement>(
    '[data-recipe="recipe-composer-form"]',
  );
  if (!form) return;
  for (const [name, value] of Object.entries(values)) {
    const field = form.querySelector<ValueField>(`[name="${name}"]`);
    if (field && field.value !== value) field.value = value;
  }
};

export const createRecipe: RecipeFactory = (announce) => {
  const title = signal('');
  const body = signal(
    'The tablet layout now keeps navigation, content, and inspector focus order aligned.',
  );
  const audience = signal<'team' | 'reviewers' | 'organization'>('team');
  const status = signal<'idle' | 'error' | 'saved'>('idle');
  const render = () =>
    renderRecipeComposerForm({
      title: title.value,
      body: body.value,
      audience: audience.value,
      error: status.value === 'error',
      saved: status.value === 'saved',
    });
  return {
    render,
    action(command, element) {
      if (command === 'reset') {
        title.value = '';
        body.value = '';
        status.value = 'idle';
        syncControlledFieldValues(element, {
          'recipe-title': title.value,
          'recipe-body': body.value,
        });
        announce('Draft reset');
        return;
      }
      if (command === 'submit') {
        status.value = title.value.trim() ? 'saved' : 'error';
        announce(
          status.value === 'saved' ? 'Update published' : 'Title required',
        );
      }
    },
    change(element) {
      const value =
        (element as HTMLElement & { value?: string | null }).value ?? '';
      if (element.getAttribute('name') === 'recipe-title') title.value = value;
      if (element.getAttribute('name') === 'recipe-body') body.value = value;
      if (
        element.getAttribute('name') === 'recipe-audience' &&
        (value === 'team' || value === 'reviewers' || value === 'organization')
      )
        audience.value = value;
    },
  };
};

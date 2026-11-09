import '@kerfjs/ui/layout.css';

import { signal } from 'kerfjs';

import { renderRecipeListWorkspaceEmpty } from '../views/recipe-list-workspace-empty.view.js';
import { renderRecipeListWorkspaceError } from '../views/recipe-list-workspace-error.view.js';
import { renderRecipeListWorkspaceLoading } from '../views/recipe-list-workspace-loading.view.js';
import { renderRecipeListWorkspacePopulated } from '../views/recipe-list-workspace-populated.view.js';
import { renderRecipeListWorkspaceShell } from '../views/recipe-list-workspace-shell.view.js';
import { renderRecipeListWorkspaceStale } from '../views/recipe-list-workspace-stale.view.js';
import type { RecipeFactory, RecipePresentation } from './types.js';

type ListState = 'loading' | 'empty' | 'populated' | 'stale' | 'error';

export const presentation: RecipePresentation = {
  viewport: {
    layout: 'grid',
    width: 'full',
    minHeight: 'medium',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: 'The recipe owns feedback placement and stable content. The app owns fetching, cache age, retry policy, and domain rows.',
};

export const createRecipe: RecipeFactory = (announce) => {
  const state = signal<ListState>('loading');
  const populated = () => (
    <section aria-label="Release Task List">
      {renderRecipeListWorkspacePopulated()}
    </section>
  );
  const renderBody = () => {
    switch (state.value) {
      case 'loading':
        return renderRecipeListWorkspaceLoading();
      case 'empty':
        return renderRecipeListWorkspaceEmpty();
      case 'error':
        return renderRecipeListWorkspaceError();
      case 'stale':
        return (
          <>
            {renderRecipeListWorkspaceStale()}
            {populated()}
          </>
        );
      case 'populated':
        return populated();
    }
  };
  const render = () =>
    renderRecipeListWorkspaceShell(
      { state: state.value },
      { body: renderBody },
    );
  return {
    render,
    action(command) {
      const next: Record<string, ListState> = {
        load: 'populated',
        empty: 'empty',
        create: 'populated',
        fail: 'error',
        retry: 'populated',
        refresh: 'stale',
        finish: 'populated',
      };
      if (command in next) state.value = next[command]!;
      announce(`List state: ${state.value}`);
    },
  };
};

import '@kerfjs/ui/layout.css';

import { signal } from 'kerfjs';

import { renderRecipeNavigationProjects } from '../views/recipe-navigation-projects.view.js';
import { renderRecipeNavigationSidebar } from '../views/recipe-navigation-sidebar.view.js';
import { renderRecipeNavigationWorkspace } from '../views/recipe-navigation-workspace.view.js';
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
  const render = () =>
    renderRecipeNavigationSidebar(
      {},
      {
        content: () => (
          <>
            <section>
              {renderRecipeNavigationWorkspace({
                inboxSelected: selected.value === 'inbox',
                sharedSelected: selected.value === 'shared',
                draftsSelected: selected.value === 'drafts',
              })}
            </section>
            <section>
              {renderRecipeNavigationProjects({
                expanded: expanded.value,
                designSelected: selected.value === 'design',
              })}
            </section>
          </>
        ),
      },
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

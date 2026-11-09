import '@kerfjs/ui/layout.css';

import { renderRecipeWorkspaceHeader } from '../views/recipe-workspace-header.view.js';
import type { RecipeFactory, RecipePresentation } from './types.js';

export const presentation: RecipePresentation = {
  viewport: {
    width: 'full',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: 'The recipe owns page hierarchy and action relocation. The app owns authorization, command behavior, breadcrumbs, and product copy.',
};

export const createRecipe: RecipeFactory = (announce) => ({
  render: () => (
    <section
      data-recipe="recipe-workspace-header"
      aria-labelledby="recipe-workspace-title"
    >
      {renderRecipeWorkspaceHeader()}
    </section>
  ),
  action(command) {
    announce(`${command} requested`);
  },
});

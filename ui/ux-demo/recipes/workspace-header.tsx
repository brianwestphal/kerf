import '@kerfjs/ui/layout.css';
import './recipes.css';

import { PageHeader } from '@kerfjs/ui/page-header';
import { StateBanner } from '@kerfjs/ui/state-banner';

import type { RecipeFactory } from './types.js';

export const createRecipe: RecipeFactory = (announce) => ({
  render: () => <section class="kui-recipe recipe-header kui-recipe__surface kui-page-gutter kui-layout" data-recipe="recipe-workspace-header"><p class="recipe-header__context kui-inline-metadata"><span>Northstar workspace</span><span>·</span><span>Product planning</span></p><PageHeader title="Accessibility readiness and responsive navigation rollout" action={<div class="kui-control-cluster"><button class="kui-recipe__button" type="button" data-action="recipe-action" data-recipe-command="share">Share</button><button class="kui-recipe__button" type="button" data-action="recipe-action" data-recipe-command="more">More actions</button><button class="kui-recipe__button" data-primary="true" type="button" data-action="recipe-action" data-recipe-command="publish">Publish update</button></div>} /><StateBanner title="Ready for review" detail="All required checks passed 18 minutes ago." tone="success" /><p class="kui-recipe__ownership">The recipe owns page hierarchy and action relocation. The app owns authorization, command behavior, breadcrumbs, and product copy.</p></section>,
  action(command) { announce(`${command} requested`); },
});

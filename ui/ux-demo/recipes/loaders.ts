import type { RecipeFactory } from './types.js';

export const recipeIds = [
  'recipe-app-shell',
  'recipe-navigation-sidebar',
  'recipe-workspace-header',
  'recipe-master-detail-dialog',
  'recipe-composer-form',
  'recipe-list-workspace-states',
  'recipe-compact-toolbar',
] as const;

export type RecipeId = typeof recipeIds[number];

export const recipeLoaders: Record<RecipeId, () => Promise<{ createRecipe: RecipeFactory }>> = {
  'recipe-app-shell': () => import('./app-shell.js'),
  'recipe-navigation-sidebar': () => import('./navigation-sidebar.js'),
  'recipe-workspace-header': () => import('./workspace-header.js'),
  'recipe-master-detail-dialog': () => import('./master-detail-dialog.js'),
  'recipe-composer-form': () => import('./composer-form.js'),
  'recipe-list-workspace-states': () => import('./list-workspace-states.js'),
  'recipe-compact-toolbar': () => import('./compact-toolbar.js'),
};

export function isRecipeId(value: string): value is RecipeId {
  return (recipeIds as readonly string[]).includes(value);
}

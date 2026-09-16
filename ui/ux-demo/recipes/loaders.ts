import type { RecipeFactory } from './types.js';

export const recipeIds = [
  'recipe-app-shell',
  'recipe-navigation-sidebar',
  'recipe-workspace-header',
  'recipe-list-detail-dialog',
  'recipe-composer-form',
  'recipe-list-workspace-states',
  'recipe-compact-toolbar',
  'recipe-navigation-stack',
  'recipe-loading-inspector',
] as const;

export type RecipeId = typeof recipeIds[number];

export const recipeLoaders: Record<RecipeId, () => Promise<{ createRecipe: RecipeFactory }>> = {
  'recipe-app-shell': () => import('./app-shell.js'),
  'recipe-navigation-sidebar': () => import('./navigation-sidebar.js'),
  'recipe-workspace-header': () => import('./workspace-header.js'),
  'recipe-list-detail-dialog': () => import('./list-detail-dialog.js'),
  'recipe-composer-form': () => import('./composer-form.js'),
  'recipe-list-workspace-states': () => import('./list-workspace-states.js'),
  'recipe-compact-toolbar': () => import('./compact-toolbar.js'),
  'recipe-navigation-stack': () => import('./navigation-stack.js'),
  'recipe-loading-inspector': () => import('./loading-inspector.js'),
};

export function isRecipeId(value: string): value is RecipeId {
  return (recipeIds as readonly string[]).includes(value);
}

import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/select/register';

import { signal } from 'kerfjs';

import { renderRecipeInspectorIconColumns3 } from '../views/recipe-inspector-icon-columns-3.view.js';
import { renderRecipeInspectorIconFileText } from '../views/recipe-inspector-icon-file-text.view.js';
import { renderRecipeInspectorIconList } from '../views/recipe-inspector-icon-list.view.js';
import { renderRecipeLoadingInspector } from '../views/recipe-loading-inspector.view.js';
import type { RecipeFactory, RecipePresentation } from './types.js';

export const presentation: RecipePresentation = {
  viewport: {
    width: 'medium',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: "Each value-bearing component's placeholder prop renders skeletons in its value slots while loading, so the recipe composes a faithful loading inspector from real chrome. The app owns the loading lifecycle and which values are still unknown.",
};

/** A record inspector whose values load without changing its component tree. */
export const createRecipe: RecipeFactory = (announce) => {
  const loading = signal(true);
  const viewChoices = [
    {
      value: 'details',
      label: 'Details',
      content: renderRecipeInspectorIconList({}),
    },
    {
      value: 'activity',
      label: 'Activity',
      content: renderRecipeInspectorIconColumns3({}),
    },
    {
      value: 'files',
      label: 'Files',
      content: renderRecipeInspectorIconFileText({}),
    },
  ];
  const render = () => {
    const value = loading.value;
    return renderRecipeLoadingInspector({
      loading: value,
      loadingText: String(value),
      toggleLabel: value ? 'Show Loaded' : 'Show Loading',
      bannerTone: value ? 'info' : 'success',
      viewChoices,
    });
  };
  return {
    render,
    action(command) {
      if (command === 'toggle') {
        loading.value = !loading.value;
        announce(loading.value ? 'Inspector is loading' : 'Inspector loaded');
      }
    },
  };
};

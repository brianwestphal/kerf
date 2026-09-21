import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import { wireResizableRegions } from '@kerfjs/ui/wire-resizable-regions';
import { delegate, mount } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';

import type { RecipeController } from './types.js';

/**
 * Copyable application boundary for a recipe. The caller owns one stable root
 * and retains the returned disposer for that root's lifetime.
 */
export function mountRecipe(
  root: HTMLElement,
  controller: RecipeController,
): () => void {
  const stopMount = mount(root, controller.render);
  const stopActions = delegateActions(root, 'click', {
    'recipe-action': (_event, element) => {
      const target = element as HTMLElement;
      controller.action(target.dataset.recipeCommand ?? '', target);
    },
  });
  const dispatchChange = (_event: Event, element: Element) =>
    controller.change?.(element as HTMLElement);
  const stopChanges = delegate(
    root,
    'change',
    'wa-select, wa-input, wa-textarea',
    dispatchChange,
  );
  const stopInputs = delegate(
    root,
    'input',
    'wa-input, wa-textarea',
    dispatchChange,
  );
  const stopDialogs = delegate(
    root,
    'wa-after-hide',
    'wa-dialog',
    (_event, element) => controller.afterHide?.(element as HTMLElement),
  );
  const stopResize = wireResizableRegions(root, {
    onCommit: ({ id, size }) => controller.resize?.(id, size),
  });
  const stopNav = wireNavStack(root, {
    onBack: () => controller.action('nav-back', root),
  });
  const stopWire = controller.wire?.(root);

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    stopWire?.();
    stopNav();
    stopResize();
    stopDialogs();
    stopInputs();
    stopChanges();
    stopActions();
    stopMount();
  };
}

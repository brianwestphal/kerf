import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/workbench.css';

import { wireWorkbench } from '@kerfjs/ui/wire-workbench';
import { delegate, signal } from 'kerfjs';

import { renderRecipeAppShellBar } from '../views/recipe-app-shell-bar.view.js';
import { renderRecipeAppShellFrame } from '../views/recipe-app-shell-frame.view.js';
import { renderRecipeAppShellInspector } from '../views/recipe-app-shell-inspector.view.js';
import { renderRecipeAppShellMainTitle } from '../views/recipe-app-shell-main-title.view.js';
import { renderRecipeAppShellNavigation } from '../views/recipe-app-shell-navigation.view.js';
import { renderRecipeAppShellNewTask } from '../views/recipe-app-shell-new-task.view.js';
import { renderRecipeAppShellRailTitle } from '../views/recipe-app-shell-rail-title.view.js';
import { renderRecipeAppShellTasks } from '../views/recipe-app-shell-tasks.view.js';
import { renderRecipeAppShellWorkbench } from '../views/recipe-app-shell-workbench.view.js';
import type { RecipeFactory, RecipePresentation } from './types.js';

const NAVIGATION_ACTION = 'recipe-shell-toggle-navigation';
const INSPECTOR_ACTION = 'recipe-shell-toggle-inspector';

export const presentation: RecipePresentation = {
  viewport: {
    width: 'full',
    height: 'app',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: 'The recipe is a Workbench under an app bar: resizable navigation and inspector rails beside the task list, each rail toggled by its standard control, which moves into the work-area toolbar while the rail is hidden. On a small screen the rails overlay the task list one at a time. The app owns routing, data, rail visibility, sizes, and persistence.',
};

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal('inbox');
  const navigationSize = signal(224);
  const inspectorSize = signal(240);
  const navigationCollapsed = signal(false);
  const inspectorCollapsed = signal(false);

  const navigation = () => (
    <nav aria-label="Workspace">
      {renderRecipeAppShellNavigation({
        inboxSelected: selected.value === 'inbox',
        projectsSelected: selected.value === 'projects',
      })}
    </nav>
  );

  const render = () =>
    renderRecipeAppShellFrame(
      {},
      {
        bar: renderRecipeAppShellBar,
        workbench: () =>
          renderRecipeAppShellWorkbench(
            {
              navigationSize: navigationSize.value,
              inspectorSize: inspectorSize.value,
              navigationCollapsed: navigationCollapsed.value,
              inspectorCollapsed: inspectorCollapsed.value,
            },
            {
              navigationTitle: () =>
                renderRecipeAppShellRailTitle({ text: 'Workspace' }),
              navigation,
              mainTitle: () =>
                renderRecipeAppShellMainTitle({
                  text:
                    selected.value === 'inbox'
                      ? 'Inbox Triage'
                      : 'Active Projects',
                }),
              newTask: renderRecipeAppShellNewTask,
              main: () => (
                <section aria-label="Tasks">
                  {renderRecipeAppShellTasks()}
                </section>
              ),
              inspectorTitle: () =>
                renderRecipeAppShellRailTitle({ text: 'Inspector' }),
              inspector: renderRecipeAppShellInspector,
            },
          ),
      },
    );

  return {
    render,
    action(command, element) {
      const id = element.dataset.itemId;
      if (id) selected.value = id;
      announce(
        id
          ? `Opened ${id}`
          : command === 'new'
            ? 'New task requested'
            : `${command} requested`,
      );
    },
    wire(root) {
      const toggle = (action: string, collapsed: typeof navigationCollapsed) =>
        delegate(root, 'click', `[data-action="${action}"]`, () => {
          collapsed.value = !collapsed.value;
        });
      const stops = [
        toggle(NAVIGATION_ACTION, navigationCollapsed),
        toggle(INSPECTOR_ACTION, inspectorCollapsed),
        wireWorkbench(root, {
          id: 'recipe-shell',
          panels: {
            leftRail: { size: navigationSize, collapsed: navigationCollapsed },
            rightRail: { size: inspectorSize, collapsed: inspectorCollapsed },
          },
          onResize: ({ panel, size }) =>
            announce(
              `${panel === 'leftRail' ? 'Navigation' : 'Inspector'} resized to ${size}px`,
            ),
        }),
      ];
      return () => {
        for (const stop of stops) stop();
      };
    },
  };
};

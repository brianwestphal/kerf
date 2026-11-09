import '@kerfjs/ui/surface-scaffold/register';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/split-view.css';
import '@kerfjs/ui/webawesome.css';

import { deviceClass } from '@kerfjs/ui/device-class';
import { openDialog } from '@kerfjs/ui/surface-scaffold';
import { signal } from 'kerfjs';

import { renderRecipeListDetailActions } from '../views/recipe-list-detail-actions.view.js';
import { renderRecipeListDetailDialog } from '../views/recipe-list-detail-dialog.view.js';
import { renderRecipeListDetailLauncher } from '../views/recipe-list-detail-launcher.view.js';
import { renderRecipeListDetailRows } from '../views/recipe-list-detail-rows.view.js';
import { renderRecipeListDetailValues } from '../views/recipe-list-detail-values.view.js';
import type { RecipeFactory, RecipePresentation } from './types.js';

const records = {
  alpha: {
    name: 'Northstar migration',
    owner: 'Mara Chen',
    state: 'In review',
    updated: 'Today, 09:42',
  },
  beta: {
    name: 'Tablet navigation',
    owner: 'Sam Rivera',
    state: 'Ready',
    updated: 'Yesterday, 16:20',
  },
  gamma: {
    name: 'Contrast audit',
    owner: 'Inez Okafor',
    state: 'Blocked',
    updated: 'Monday, 11:05',
  },
} as const;

type RecordId = keyof typeof records;

export const presentation: RecipePresentation = {
  viewport: { layout: 'grid', width: 'full' },
  note: 'ListDetailDialog: on roomy devices a full-height list column with its own title sits beside a full-height detail column that carries the primary title, the close control, and the record actions, so the divider runs from top to bottom. Compact devices get a full-screen dialog that drills from the list into the detail. The component owns the native modal dialog, the columns, and the compact drill-down; the app owns open state, selection, and record actions.',
};

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal<RecordId>('alpha');
  // Compact devices drill from the list into the detail; this flag is the
  // pushed detail view. Roomy devices show both panes side by side.
  const detailOpen = signal(false);
  const device = deviceClass();

  const projectRows = (compact: boolean) => (
    <section aria-label="Projects">
      {renderRecipeListDetailRows({
        records: Object.entries(records).map(([id, record]) => ({
          id,
          name: record.name,
          description: `${record.owner} · ${record.state}`,
          selected: !compact && selected.value === id,
        })),
        compact,
        controlInsets: compact ? undefined : 'tb',
      })}
    </section>
  );

  const recordActions = renderRecipeListDetailActions;

  const render = () => {
    const compact = device.value.compact;
    const record = records[selected.value];
    return (
      <section
        data-recipe="recipe-list-detail-dialog"
        aria-label="Project Details Dialog"
      >
        {renderRecipeListDetailLauncher(
          {},
          {
            dialog: () =>
              renderRecipeListDetailDialog(
                {
                  compact,
                  detailActive: detailOpen.value,
                  name: record.name,
                },
                {
                  listContent: () => projectRows(compact),
                  detailContent: () =>
                    renderRecipeListDetailValues({
                      owner: record.owner,
                      state: record.state,
                      updated: record.updated,
                    }),
                  footer: recordActions,
                },
              ),
          },
        )}
      </section>
    );
  };
  return {
    render,
    action(command, element) {
      if (command === 'nav-back') {
        detailOpen.value = false;
        announce('Back to projects');
        return;
      }
      const id = element.dataset.itemId;
      if (id && id in records) {
        selected.value = id as RecordId;
        detailOpen.value = true;
        announce(`Selected ${records[selected.value].name}`);
        return;
      }
      const dialog = element
        .closest('[data-recipe]')
        ?.querySelector<HTMLDialogElement>('dialog.kui-dialog-surface');
      if (command === 'open' && dialog) {
        element.focus();
        openDialog(dialog);
        return;
      }
      announce(`${command} requested`);
    },
    afterHide() {
      detailOpen.value = false;
    },
  };
};

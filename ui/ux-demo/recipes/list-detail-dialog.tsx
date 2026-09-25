import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';
import './list-detail-dialog.css';

import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { FileText } from 'lucide';

import {
  RecipeHeadingSummary,
  RecipeOwnershipNote,
  RecipeRoot,
} from './recipe-root.js';
import type { RecipeFactory } from './types.js';

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

interface RecipeDialogElement extends HTMLElement {
  open: boolean;
}

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal<keyof typeof records>('alpha');
  const open = { value: false };
  const render = () => (
    <RecipeRoot recipe="recipe-list-detail-dialog" surface={false}>
      <div class="recipe-list-detail-dialog kui-content">
        <wa-button
          variant="brand"
          appearance="accent"
          data-action="recipe-action"
          data-recipe-command="open"
        >
          Open project details
        </wa-button>
        <RecipeOwnershipNote>
          Web Awesome owns modal focus and dismissal. The recipe owns
          header/body/list-detail anatomy; the app owns open state, selection,
          and policy.
        </RecipeOwnershipNote>
        <wa-dialog
          class="recipe-dialog"
          label="Project details"
          without-header
          open={open.value}
          style="--spacing:0;--width:min(62rem, calc(100vw - 2rem))"
        >
          <Pane>
            <div class="recipe-list-detail">
              <div class="recipe-list-detail__list">
                <Pane contentElement="nav" contentLabel="Projects">
                  <ListHeader label="Recent projects" />
                  <section>
                    {Object.entries(records).map(([id, record]) => (
                      <ListItem
                        action="recipe-action"
                        itemId={id}
                        label={record.name}
                        selected={selected.value === id}
                        multiline
                      />
                    ))}
                  </section>
                </Pane>
              </div>
              <div class="recipe-list-detail__detail">
                <Pane
                  element="section"
                  header={
                    <>
                      <Toolbar
                        label="Project details"
                        dividerSides=""
                        leading={
                          <>
                            <ToolbarControlGroup appearance="borderless" single>
                              <LucideIcon icon={FileText} name="file-text" />
                            </ToolbarControlGroup>
                            <ToolbarText
                              text="Project details"
                              size="xlarge"
                              id="recipe-dialog-title"
                            />
                          </>
                        }
                        trailing={
                          <ToolbarControlGroup appearance="borderless" single>
                            <wa-button
                              appearance="plain"
                              data-action="recipe-action"
                              data-recipe-command="close"
                            >
                              Close
                            </wa-button>
                          </ToolbarControlGroup>
                        }
                      />
                      <RecipeHeadingSummary id="recipe-dialog-summary">
                        Compare delivery state without leaving the workspace.
                      </RecipeHeadingSummary>
                    </>
                  }
                >
                  <div class="recipe-list-detail__body">
                    <div aria-live="polite">
                      <h3 class="recipe-list-detail__title kui-content-item">
                        {records[selected.value].name}
                      </h3>
                      <ValueTable label="Project details">
                        <ValueTableRow
                          label="Owner"
                          value={records[selected.value].owner}
                        />
                        <ValueTableRow
                          label="Status"
                          value={records[selected.value].state}
                        />
                        <ValueTableRow
                          label="Updated"
                          value={records[selected.value].updated}
                        />
                      </ValueTable>
                      <div class="recipe-list-detail__actions kui-control-cluster">
                        <wa-button
                          appearance="outlined"
                          data-action="recipe-action"
                          data-recipe-command="archive"
                        >
                          Archive
                        </wa-button>
                        <wa-button
                          variant="brand"
                          appearance="accent"
                          data-action="recipe-action"
                          data-recipe-command="open-record"
                        >
                          Open project
                        </wa-button>
                      </div>
                    </div>
                  </div>
                </Pane>
              </div>
            </div>
          </Pane>
        </wa-dialog>
      </div>
    </RecipeRoot>
  );
  return {
    render,
    action(command, element) {
      const id = element.dataset.itemId;
      if (id && id in records) {
        selected.value = id as keyof typeof records;
        announce(`Selected ${records[selected.value].name}`);
        return;
      }
      const dialog = element
        .closest('[data-recipe]')
        ?.querySelector<RecipeDialogElement>('wa-dialog');
      if (command === 'open' && dialog) {
        element.focus();
        open.value = true;
        dialog.open = true;
        return;
      }
      if (command === 'close' && dialog) {
        dialog.open = false;
        return;
      }
      announce(`${command} requested`);
    },
    afterHide() {
      open.value = false;
    },
  };
};

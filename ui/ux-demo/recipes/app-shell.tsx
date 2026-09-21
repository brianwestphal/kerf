import '@kerfjs/ui/layout.css';
import './recipes.css';

import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PanelHeader } from '@kerfjs/ui/panel-header';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { Bell, Folder, Inbox, Settings } from 'lucide';

import type { RecipeFactory } from './types.js';

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal('inbox');
  const navigationSize = signal(224);
  const inspectorSize = signal(240);
  const responsivePane = signal<'content' | 'navigation' | 'inspector'>(
    'content',
  );
  const render = () => (
    <section
      class="kui-recipe recipe-shell kui-recipe__surface kui-layout"
      data-recipe="recipe-app-shell"
      data-responsive-pane={responsivePane.value}
    >
      <Toolbar
        label="Atlas workspace"
        leading={
          <ToolbarControlGroup appearance="borderless" single>
            <ToolbarText text="Atlas" />
          </ToolbarControlGroup>
        }
        trailing={
          <div class="recipe-shell__toolbar-actions">
            <ToolbarControlGroup
              className="recipe-shell__responsive-controls"
              appearance="borderless"
              label="Workspace panes"
            >
              <button
                type="button"
                aria-label="Show navigation"
                aria-controls="recipe-shell-navigation"
                aria-pressed={String(responsivePane.value === 'navigation')}
                data-action="recipe-action"
                data-recipe-command="show-navigation"
              >
                <LucideIcon icon={Folder} name="folder" />
              </button>
              <button
                type="button"
                aria-label="Show content"
                aria-controls="recipe-shell-content"
                aria-pressed={String(responsivePane.value === 'content')}
                data-action="recipe-action"
                data-recipe-command="show-content"
              >
                <LucideIcon icon={Inbox} name="inbox" />
              </button>
              <button
                type="button"
                aria-label="Show inspector"
                aria-controls="recipe-shell-inspector"
                aria-pressed={String(responsivePane.value === 'inspector')}
                data-action="recipe-action"
                data-recipe-command="show-inspector"
              >
                <LucideIcon icon={Settings} name="settings" />
              </button>
            </ToolbarControlGroup>
            <ToolbarControlGroup
              appearance="borderless"
              label="Workspace controls"
            >
              <button
                type="button"
                aria-label="Notifications"
                data-action="recipe-action"
                data-recipe-command="notify"
              >
                <LucideIcon icon={Bell} name="bell" />
              </button>
              <button
                type="button"
                aria-label="Settings"
                data-action="recipe-action"
                data-recipe-command="settings"
              >
                <LucideIcon icon={Settings} name="settings" />
              </button>
            </ToolbarControlGroup>
          </div>
        }
      />
      <div class="recipe-shell__body">
        <div id="recipe-shell-navigation" class="recipe-shell__nav-region">
          <ResizableRegion
            id="recipe-navigation"
            label="Navigation"
            size={navigationSize.value}
            min={180}
            max={320}
          >
            <aside class="recipe-shell__nav kui-pane">
              <ListHeader label="Workspace" />
              <nav
                class="recipe-shell__nav-list kui-pane__content kui-content"
                aria-label="Workspace"
              >
                <section>
                  <ListItem
                    action="recipe-action"
                    itemId="inbox"
                    label="Inbox"
                    icon={<LucideIcon icon={Inbox} name="inbox" />}
                    selected={selected.value === 'inbox'}
                  />
                  <ListItem
                    action="recipe-action"
                    itemId="projects"
                    label="Projects with a deliberately wrapping title"
                    icon={<LucideIcon icon={Folder} name="folder" />}
                    selected={selected.value === 'projects'}
                    multiline
                  />
                </section>
              </nav>
            </aside>
          </ResizableRegion>
        </div>
        <main id="recipe-shell-content" class="recipe-shell__main kui-pane">
          <PanelHeader
            title={
              selected.value === 'inbox' ? 'Inbox triage' : 'Active projects'
            }
            titleId="recipe-shell-main-title"
            actions={
              <button
                class="kui-recipe__button"
                data-primary="true"
                type="button"
                data-action="recipe-action"
                data-recipe-command="new"
              >
                New task
              </button>
            }
          />
          <div class="recipe-shell__main-body kui-pane__content kui-content">
            <p class="kui-recipe__ownership kui-content-item">
              Recipe owns pane geometry and one scroll owner per pane. The app
              owns routing, data, pane visibility, sizes, and persistence.
            </p>
            <div class="recipe-shell__cards">
              {[
                'Release accessibility audit',
                'Prepare tablet navigation',
                'Review stale-data states',
                'Confirm package boundaries',
              ].map((title) => (
                <article class="recipe-shell__card kui-content-item">
                  <strong>{title}</strong>
                  <p class="kui-recipe__muted">
                    Assigned to the interface systems team · due this week
                  </p>
                </article>
              ))}
            </div>
          </div>
        </main>
        <div id="recipe-shell-inspector" class="recipe-shell__inspector-region">
          <ResizableRegion
            id="recipe-inspector"
            label="Inspector"
            size={inspectorSize.value}
            min={200}
            max={360}
            edge="start"
          >
            <aside class="recipe-shell__inspector kui-pane">
              <PanelHeader
                title="Inspector"
                titleId="recipe-shell-inspector-title"
              />
              <div class="recipe-shell__inspector-body kui-pane__content kui-content">
                <ValueTable label="Selected task">
                  <ValueTableRow label="Status" value="In review" />
                  <ValueTableRow label="Owner" value="Mara Chen" />
                  <ValueTableRow label="Priority" value="High" />
                </ValueTable>
              </div>
            </aside>
          </ResizableRegion>
        </div>
      </div>
    </section>
  );
  return {
    render,
    action(command, element) {
      const pane = command.match(
        /^show-(navigation|content|inspector)$/,
      )?.[1] as typeof responsivePane.value | undefined;
      if (pane) responsivePane.value = pane;
      const id = element.dataset.itemId;
      if (id) selected.value = id;
      announce(
        id
          ? `Opened ${id}`
          : pane
            ? `Showing ${pane}`
            : command === 'new'
              ? 'New task requested'
              : `${command} requested`,
      );
    },
    resize(id, size) {
      if (id === 'recipe-navigation') navigationSize.value = size;
      if (id === 'recipe-inspector') inspectorSize.value = size;
      announce(`${id} resized to ${size}px`);
    },
  };
};

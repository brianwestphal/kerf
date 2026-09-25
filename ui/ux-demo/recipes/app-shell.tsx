import '@kerfjs/ui/layout.css';
import './app-shell.css';

import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { Bell, Folder, Inbox, Settings } from 'lucide';

import {
  RecipeMutedText,
  RecipeOwnershipNote,
  RecipeRoot,
} from './recipe-root.js';
import type { RecipeFactory } from './types.js';

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal('inbox');
  const navigationSize = signal(224);
  const inspectorSize = signal(240);
  const responsivePane = signal<'content' | 'navigation' | 'inspector'>(
    'content',
  );
  const render = () => (
    <RecipeRoot
      recipe="recipe-app-shell"
      dataAttributes={{ 'data-responsive-pane': responsivePane.value }}
    >
      <div
        class="recipe-shell kui-layout"
        data-responsive-pane={responsivePane.value}
      >
        <Toolbar
          label="Atlas workspace"
          leading={<ToolbarText text="Atlas" />}
          trailing={
            <>
              <ToolbarControlGroup
                appearance="borderless"
                label="Workspace panes"
                visibility="compact-only"
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
            </>
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
              responsiveFillAt="compact"
            >
              <div class="recipe-shell__nav">
                <Pane
                  element="aside"
                  contentElement="nav"
                  contentClassName="recipe-shell__nav-list"
                  contentLabel="Workspace"
                >
                  <ListHeader label="Workspace" />
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
                </Pane>
              </div>
            </ResizableRegion>
          </div>
          <div class="recipe-shell__main">
            <Pane
              element="main"
              id="recipe-shell-content"
              contentClassName="recipe-shell__main-body"
              header={
                <Toolbar
                  label="Current workspace view"
                  dividerSides=""
                  leading={
                    <ToolbarText
                      text={
                        selected.value === 'inbox'
                          ? 'Inbox triage'
                          : 'Active projects'
                      }
                      size="xlarge"
                      id="recipe-shell-main-title"
                    />
                  }
                  trailing={
                    <ToolbarControlGroup
                      appearance="borderless"
                      content="text"
                      single
                    >
                      <button
                        type="button"
                        data-action="recipe-action"
                        data-recipe-command="new"
                      >
                        New task
                      </button>
                    </ToolbarControlGroup>
                  }
                />
              }
            >
              <RecipeOwnershipNote>
                Recipe owns pane geometry and one scroll owner per pane. The app
                owns routing, data, pane visibility, sizes, and persistence.
              </RecipeOwnershipNote>
              <div class="recipe-shell__cards">
                {[
                  'Release accessibility audit',
                  'Prepare tablet navigation',
                  'Review stale-data states',
                  'Confirm package boundaries',
                ].map((title) => (
                  <article class="recipe-shell__card kui-content-item">
                    <strong>{title}</strong>
                    <RecipeMutedText>
                      Assigned to the interface systems team · due this week
                    </RecipeMutedText>
                  </article>
                ))}
              </div>
            </Pane>
          </div>
          <div
            id="recipe-shell-inspector"
            class="recipe-shell__inspector-region"
          >
            <ResizableRegion
              id="recipe-inspector"
              label="Inspector"
              size={inspectorSize.value}
              min={200}
              max={360}
              edge="start"
              responsiveFillAt="narrow"
            >
              <div class="recipe-shell__inspector">
                <Pane
                  element="aside"
                  contentClassName="recipe-shell__inspector-body"
                  header={
                    <Toolbar
                      label="Inspector"
                      dividerSides=""
                      leading={
                        <ToolbarText
                          text="Inspector"
                          size="xlarge"
                          id="recipe-shell-inspector-title"
                        />
                      }
                    />
                  }
                >
                  <ValueTable label="Selected task">
                    <ValueTableRow label="Status" value="In review" />
                    <ValueTableRow label="Owner" value="Mara Chen" />
                    <ValueTableRow label="Priority" value="High" />
                  </ValueTable>
                </Pane>
              </div>
            </ResizableRegion>
          </div>
        </div>
      </div>
    </RecipeRoot>
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

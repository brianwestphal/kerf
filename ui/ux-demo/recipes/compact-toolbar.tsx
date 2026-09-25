import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/select/register';
import './compact-toolbar.css';

import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select } from '@kerfjs/ui/select';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';
import { Filter, MoreHorizontal, RefreshCw } from 'lucide';

import {
  RecipeMutedText,
  RecipeOwnershipNote,
  RecipeRoot,
} from './recipe-root.js';
import type { RecipeFactory } from './types.js';

export const createRecipe: RecipeFactory = (announce) => {
  const view = signal('list');
  const sort = signal('updated');
  const filtered = signal(false);
  const render = () => (
    <RecipeRoot recipe="recipe-compact-toolbar">
      <div class="recipe-compact-toolbar kui-layout">
        <Toolbar
          label="Task workspace controls"
          responsive="stack"
          responsiveAt="compact"
          leading={<ToolbarText text="Tasks" size="small" />}
          center={
            <ToolbarControlGroup>
              <SegmentedControl<string>
                id="recipe-view"
                label="View"
                value={view.value}
                action="recipe-action"
                appearance="toolbar"
                shape="pill"
                size="small"
                choices={[
                  { value: 'list', label: 'List' },
                  { value: 'board', label: 'Board' },
                  { value: 'timeline', label: 'Timeline' },
                ]}
              />
            </ToolbarControlGroup>
          }
          trailing={
            <>
              <ToolbarControlGroup single focusRing="outline">
                <Select<string>
                  name="recipe-sort"
                  value={sort.value}
                  ariaLabel="Sort tasks"
                  fitMenu
                  presentation="toolbar-borderless"
                  size="compact"
                  focusRingOwner="group"
                  choices={[
                    { value: 'updated', label: 'Recently updated' },
                    { value: 'priority', label: 'Priority' },
                    { value: 'owner', label: 'Owner' },
                    { value: 'created', label: 'Created date' },
                  ]}
                />
              </ToolbarControlGroup>
              <ToolbarControlGroup label="Task actions" buttonAppearance="push">
                <button
                  type="button"
                  aria-label="Toggle filters"
                  aria-pressed={String(filtered.value)}
                  data-action="recipe-action"
                  data-recipe-command="filter"
                >
                  <LucideIcon icon={Filter} name="filter" />
                </button>
                <button
                  type="button"
                  aria-label="Refresh tasks"
                  data-action="recipe-action"
                  data-recipe-command="refresh"
                >
                  <LucideIcon icon={RefreshCw} name="refresh-cw" />
                </button>
              </ToolbarControlGroup>
              <ToolbarControlGroup label="More task actions" single>
                <button
                  type="button"
                  aria-label="More task actions"
                  data-action="recipe-action"
                  data-recipe-command="more"
                >
                  <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
                </button>
              </ToolbarControlGroup>
            </>
          }
        />
        <div class="recipe-compact-toolbar__guide kui-content-item">
          <div>
            <strong>ToolbarControlGroup</strong>
            <RecipeMutedText>
              Related commands or pressed tools.
            </RecipeMutedText>
          </div>
          <div>
            <strong>SegmentedControl</strong>
            <RecipeMutedText>A few visible exclusive choices.</RecipeMutedText>
          </div>
          <div>
            <strong>Select</strong>
            <RecipeMutedText>A longer controlled value list.</RecipeMutedText>
          </div>
          <div>
            <strong>Ordinary button</strong>
            <RecipeMutedText>One independent command.</RecipeMutedText>
          </div>
        </div>
        <RecipeOwnershipNote>
          The recipe owns control semantics and wrapping. The app owns values,
          actions, persistence, and responsive priority.
        </RecipeOwnershipNote>
      </div>
    </RecipeRoot>
  );
  return {
    render,
    action(command, element) {
      const value = element.dataset.segmentValue;
      if (value) view.value = value;
      if (command === 'filter') filtered.value = !filtered.value;
      announce(
        value
          ? `View: ${value}`
          : command === 'filter'
            ? `Filters ${filtered.value ? 'on' : 'off'}`
            : `${command} requested`,
      );
    },
    change(element) {
      const value = (element as HTMLElement & { value?: string }).value;
      if (element.getAttribute('name') === 'recipe-sort' && value) {
        sort.value = value;
        announce(`Sort: ${value}`);
      }
    },
  };
};

import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/select/register';
import './recipes.css';

import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select } from '@kerfjs/ui/select';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';
import { Filter, MoreHorizontal, RefreshCw } from 'lucide';

import type { RecipeFactory } from './types.js';

export const createRecipe: RecipeFactory = (announce) => {
  const view = signal('list');
  const sort = signal('updated');
  const filtered = signal(false);
  const render = () => <section class="kui-recipe recipe-compact-toolbar kui-recipe__surface kui-layout" data-recipe="recipe-compact-toolbar">
    <Toolbar
      label="Task workspace controls"
      leading={<ToolbarText text="Tasks" size="small" />}
      center={<SegmentedControl id="recipe-view" label="View" value={view.value} action="recipe-action" appearance="toolbar" shape="pill" size="small" choices={[{ value: 'list', label: 'List' }, { value: 'board', label: 'Board' }, { value: 'timeline', label: 'Timeline' }]} />}
      trailing={<div class="kui-control-cluster"><Select name="recipe-sort" value={sort.value} ariaLabel="Sort tasks" fitMenu choices={[{ value: 'updated', label: 'Recently updated' }, { value: 'priority', label: 'Priority' }, { value: 'owner', label: 'Owner' }, { value: 'created', label: 'Created date' }]} /><ToolbarControlGroup label="Task actions" buttonAppearance="push"><button type="button" aria-label="Toggle filters" aria-pressed={String(filtered.value)} data-action="recipe-action" data-recipe-command="filter"><LucideIcon icon={Filter} name="filter" /></button><button type="button" aria-label="Refresh tasks" data-action="recipe-action" data-recipe-command="refresh"><LucideIcon icon={RefreshCw} name="refresh-cw" /></button></ToolbarControlGroup><button class="kui-recipe__button" type="button" aria-label="More task actions" data-action="recipe-action" data-recipe-command="more"><LucideIcon icon={MoreHorizontal} name="more-horizontal" /></button></div>}
    />
    <div class="recipe-compact-toolbar__guide kui-surface-body"><div><strong>ToolbarControlGroup</strong><span class="kui-recipe__muted">Related commands or pressed tools.</span></div><div><strong>SegmentedControl</strong><span class="kui-recipe__muted">A few visible exclusive choices.</span></div><div><strong>Select</strong><span class="kui-recipe__muted">A longer controlled value list.</span></div><div><strong>Ordinary button</strong><span class="kui-recipe__muted">One independent command.</span></div></div>
    <p class="kui-recipe__ownership kui-surface-body">The recipe owns control semantics and wrapping. The app owns values, actions, persistence, and responsive priority.</p>
  </section>;
  return {
    render,
    action(command, element) {
      const value = element.dataset.segmentValue;
      if (value) view.value = value;
      if (command === 'filter') filtered.value = !filtered.value;
      announce(value ? `View: ${value}` : command === 'filter' ? `Filters ${filtered.value ? 'on' : 'off'}` : `${command} requested`);
    },
    change(element) {
      const value = (element as HTMLElement & { value?: string }).value;
      if (element.getAttribute('name') === 'recipe-sort' && value) { sort.value = value; announce(`Sort: ${value}`); }
    },
  };
};

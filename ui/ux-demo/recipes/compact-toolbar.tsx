import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/select/register';

import { deviceClass } from '@kerfjs/ui/device-class';
import { Grid } from '@kerfjs/ui/grid';
import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select } from '@kerfjs/ui/select';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';
import { Filter, MoreHorizontal, RefreshCw } from 'lucide';

import type { RecipeFactory, RecipePresentation } from './types.js';

const guide = [
  ['ToolbarControlGroup', 'Related commands or pressed tools.'],
  ['SegmentedControl', 'A few visible exclusive choices.'],
  ['Select', 'A longer controlled value list.'],
  ['Ordinary button', 'One independent command.'],
] as const;

export const presentation: RecipePresentation = {
  viewport: {
    width: 'full',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: 'The recipe owns control semantics and wrapping. The app owns values, actions, persistence, and responsive priority.',
};

export const createRecipe: RecipeFactory = (announce) => {
  const view = signal('list');
  const sort = signal('updated');
  const filtered = signal(false);
  const device = deviceClass();
  const render = () => (
    <section data-recipe="recipe-compact-toolbar" aria-label="Task workspace">
      <List gap="l" controlInsets="b">
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
        <Grid
          columns={
            device.value.compact ? 1 : device.value.atLeast('desktop') ? 4 : 2
          }
          gap="none"
        >
          {guide.map(([name, use]) => (
            <ListInsetText>
              <List gap="2xs">
                <Text variant="span">
                  <strong>{name}</strong>
                </Text>
                <Text variant="span" tone="quiet" size="compact">
                  {use}
                </Text>
              </List>
            </ListInsetText>
          ))}
        </Grid>
      </List>
    </section>
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

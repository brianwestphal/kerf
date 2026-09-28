import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/workbench.css';

import { List } from '@kerfjs/ui/list';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { wireWorkbench } from '@kerfjs/ui/wire-workbench';
import { Workbench } from '@kerfjs/ui/workbench';
import { delegate, signal } from 'kerfjs';
import { Bell, Folder, Inbox, Settings } from 'lucide';

import type { RecipeFactory, RecipePresentation } from './types.js';

const NAVIGATION_ACTION = 'recipe-shell-toggle-navigation';
const INSPECTOR_ACTION = 'recipe-shell-toggle-inspector';

const tasks = [
  ['Release accessibility audit', 'Interface systems · due this week'],
  ['Prepare tablet navigation', 'Interface systems · due this week'],
  ['Review stale-data states', 'Platform · due next week'],
  ['Confirm package boundaries', 'Platform · due next week'],
] as const;

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
      <List gap="2xs">
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
      </List>
    </nav>
  );

  const render = () => (
    <List fill rootAttributes={{ 'data-recipe': 'recipe-app-shell' }}>
      <Toolbar
        label="Atlas workspace"
        safeAreaEdges={['block-start', 'inline-start', 'inline-end']}
        dividerSides="b"
        leading={<ToolbarText text="Atlas" />}
        trailing={
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
        }
      />
      <List flex>
        <Workbench
          id="recipe-shell"
          label="Atlas workspace panes"
          leftRail={{
            label: 'Navigation',
            size: navigationSize.value,
            resizable: { min: 180, max: 320 },
            collapsed: navigationCollapsed.value,
            toolbar: {
              label: 'Navigation',
              title: <ToolbarText text="Workspace" />,
              toggle: { action: NAVIGATION_ACTION, name: 'navigation' },
            },
            content: navigation(),
          }}
          mainToolbar={{
            label: 'Current workspace view',
            title: (
              <ToolbarText
                text={
                  selected.value === 'inbox'
                    ? 'Inbox triage'
                    : 'Active projects'
                }
                size="xlarge"
                id="recipe-shell-main-title"
              />
            ),
            responsive: 'wrap',
            trailing: (
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
            ),
          }}
          main={
            <section aria-label="Tasks">
              {tasks.map(([title, detail]) => (
                <ListItem
                  action="recipe-action"
                  label={title}
                  description={detail}
                  multiline
                  rootAttributes={{ 'data-recipe-command': 'open-task' }}
                />
              ))}
            </section>
          }
          rightRail={{
            label: 'Inspector',
            size: inspectorSize.value,
            resizable: { min: 200, max: 360 },
            collapsed: inspectorCollapsed.value,
            toolbar: {
              label: 'Inspector',
              title: <ToolbarText text="Inspector" />,
              toggle: { action: INSPECTOR_ACTION, name: 'inspector' },
            },
            content: (
              <ValueTable label="Selected task">
                <ValueTableRow label="Status" value="In review" />
                <ValueTableRow label="Owner" value="Mara Chen" />
                <ValueTableRow label="Priority" value="High" />
              </ValueTable>
            ),
          }}
        />
      </List>
    </List>
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

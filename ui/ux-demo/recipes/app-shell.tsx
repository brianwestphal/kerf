import '@kerfjs/ui/layout.css';

import { deviceClass } from '@kerfjs/ui/device-class';
import { Grid } from '@kerfjs/ui/grid';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane, type PaneSeparatorSide } from '@kerfjs/ui/pane';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { Row } from '@kerfjs/ui/row';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { Bell, Folder, Inbox, Settings } from 'lucide';

import type { RecipeFactory, RecipePresentation } from './types.js';

type ShellPane = 'content' | 'navigation' | 'inspector';
type ScreenEdges = readonly PaneSeparatorSide[];

// Safe areas: the app bar claims the top edge and both sides, so it clears the
// status area. Each pane below compensates only for the screen edges it
// actually reaches: the bottom, plus its outer side in the three-pane layout or
// both sides when it is the only pane shown.
const appBarEdges: ScreenEdges = ['block-start', 'inline-start', 'inline-end'];
const soleEdges: ScreenEdges = ['block-end', 'inline-start', 'inline-end'];

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
  note: 'The recipe owns pane geometry and one scroll owner per pane. The app owns routing, data, pane visibility, sizes, and persistence.',
};

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal('inbox');
  const navigationSize = signal(224);
  const inspectorSize = signal(240);
  const responsivePane = signal<ShellPane>('content');
  // Desktop-class viewports show all three panes; smaller ones show one pane
  // at a time and let the toolbar switch between them.
  const device = deviceClass();

  const paneButton = (
    pane: ShellPane,
    label: string,
    icon: typeof Folder,
    iconName: string,
  ) => (
    <button
      type="button"
      aria-label={label}
      aria-controls={`recipe-shell-${pane}`}
      aria-pressed={String(responsivePane.value === pane)}
      data-action="recipe-action"
      data-recipe-command={`show-${pane}`}
    >
      <LucideIcon icon={icon} name={iconName} />
    </button>
  );

  const navigation = (edges: ScreenEdges) => (
    <Pane
      element="aside"
      safeAreaEdges={edges}
      id="recipe-shell-navigation"
      contentElement="nav"
      contentLabel="Workspace"
    >
      <section>
        <ListHeader label="Workspace" />
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
  );

  const content = (edges: ScreenEdges) => (
    <Pane
      element="main"
      safeAreaEdges={edges}
      id="recipe-shell-content"
      header={
        <Toolbar
          label="Current workspace view"
          dividerSides=""
          leading={
            <ToolbarText
              text={
                selected.value === 'inbox' ? 'Inbox triage' : 'Active projects'
              }
              size="xlarge"
              id="recipe-shell-main-title"
            />
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" content="text" single>
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
    </Pane>
  );

  const inspector = (edges: ScreenEdges) => (
    <Pane
      element="aside"
      safeAreaEdges={edges}
      id="recipe-shell-inspector"
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
  );

  const render = () => {
    const onePane = !device.value.atLeast('desktop');
    return (
      <List
        fill
        rootAttributes={{
          'data-recipe': 'recipe-app-shell',
          'data-responsive-pane': onePane ? responsivePane.value : 'all',
        }}
      >
        <Toolbar
          label="Atlas workspace"
          safeAreaEdges={appBarEdges}
          leading={<ToolbarText text="Atlas" />}
          trailing={
            <>
              {onePane ? (
                <ToolbarControlGroup
                  appearance="borderless"
                  buttonAppearance="push"
                  label="Workspace panes"
                >
                  {paneButton(
                    'navigation',
                    'Show navigation',
                    Folder,
                    'folder',
                  )}
                  {paneButton('content', 'Show content', Inbox, 'inbox')}
                  {paneButton(
                    'inspector',
                    'Show inspector',
                    Settings,
                    'settings',
                  )}
                </ToolbarControlGroup>
              ) : null}
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
        {onePane ? (
          <Grid columns={1} gap="none" flex>
            {responsivePane.value === 'navigation'
              ? navigation(soleEdges)
              : responsivePane.value === 'inspector'
                ? inspector(soleEdges)
                : content(soleEdges)}
          </Grid>
        ) : (
          <Row gap="none" flex>
            <ResizableRegion
              id="recipe-navigation"
              label="Navigation"
              size={navigationSize.value}
              min={180}
              max={320}
            >
              {navigation(['block-end', 'inline-start'])}
            </ResizableRegion>
            <Grid columns={1} gap="none" flex>
              {content(['block-end'])}
            </Grid>
            <ResizableRegion
              id="recipe-inspector"
              label="Inspector"
              size={inspectorSize.value}
              min={200}
              max={360}
              edge="start"
            >
              {inspector(['block-end', 'inline-end'])}
            </ResizableRegion>
          </Row>
        )}
      </List>
    );
  };
  return {
    render,
    action(command, element) {
      const pane = command.match(
        /^show-(navigation|content|inspector)$/,
      )?.[1] as ShellPane | undefined;
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

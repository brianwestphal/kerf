import '@kerfjs/ui/layout.css';

import { Button } from '@kerfjs/ui/button';
import { EmptyState } from '@kerfjs/ui/empty-state';
import { ListItem } from '@kerfjs/ui/list-item';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';

import type { RecipeFactory, RecipePresentation } from './types.js';

type ListState = 'loading' | 'empty' | 'populated' | 'stale' | 'error';
const items = [
  ['Audit keyboard focus order', 'In review · Mara'],
  ['Verify 200% zoom layout', 'Ready · Sam'],
  ['Publish package migration notes', 'Draft · Inez'],
] as const;

export const presentation: RecipePresentation = {
  viewport: {
    layout: 'grid',
    width: 'full',
    minHeight: 'medium',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: 'The recipe owns feedback placement and stable content. The app owns fetching, cache age, retry policy, and domain rows.',
};

export const createRecipe: RecipeFactory = (announce) => {
  const state = signal<ListState>('loading');
  const populated = () => (
    <section aria-label="Release Task List">
      {items.map(([title, detail]) => (
        <ListItem
          action="recipe-action"
          label={title}
          description={detail}
          rootAttributes={{ 'data-recipe-command': 'open-task' }}
        />
      ))}
    </section>
  );
  const renderBody = () => {
    if (state.value === 'loading')
      return (
        <EmptyState
          title="Loading Release Tasks"
          detail="The current workspace will appear when data is ready."
          busy
          action={
            <Button
              action="recipe-action"
              rootAttributes={{ 'data-recipe-command': 'load' }}
            >
              Complete Load
            </Button>
          }
        />
      );
    if (state.value === 'empty')
      return (
        <EmptyState
          title="No Release Tasks"
          detail="Create the first task for this milestone."
          action={
            <Button
              action="recipe-action"
              rootAttributes={{ 'data-recipe-command': 'create' }}
            >
              Create Task
            </Button>
          }
        />
      );
    if (state.value === 'error')
      return (
        <StateBanner
          title="Release Tasks Could Not Be Refreshed"
          detail="Existing filters are preserved. Try again when the connection recovers."
          tone="danger"
          urgency="alert"
          // Raw: StateBanner draws a plain button as its tone-matched pill;
          // Button has no warning or pop tone and keeps its own look.
          action={
            <button
              type="button"
              data-action="recipe-action"
              data-recipe-command="retry"
            >
              Retry
            </button>
          }
        />
      );
    return (
      <>
        {state.value === 'stale' && (
          <StateBanner
            title="Showing Saved Results"
            detail="Refreshing in the background."
            tone="warning"
            // Raw: StateBanner draws a plain button as its tone-matched pill;
            // Button has no warning or pop tone and keeps its own look.
            action={
              <Row gap="xs" vAlign="middle">
                <LoadingSpinner label="Refreshing release tasks…" />
                <button
                  type="button"
                  data-action="recipe-action"
                  data-recipe-command="finish"
                >
                  Finish Refresh
                </button>
              </Row>
            }
          />
        )}
        {populated()}
      </>
    );
  };
  const render = () => (
    <Pane
      element="section"
      label="Release Tasks"
      rootAttributes={{
        'data-recipe': 'recipe-list-workspace-states',
        'data-list-state': state.value,
      }}
      header={
        <Toolbar
          label="Release Tasks"
          responsive="stack"
          responsiveAt="compact"
          leading={
            <ToolbarText
              text="Release Tasks"
              size="xlarge"
              id="recipe-list-title"
            />
          }
          trailing={
            <ToolbarControlGroup
              appearance="borderless"
              content="text"
              buttonAppearance="push"
            >
              <ToolbarButton
                action="recipe-action"
                rootAttributes={{ 'data-recipe-command': 'empty' }}
              >
                Clear
              </ToolbarButton>
              <ToolbarButton
                action="recipe-action"
                rootAttributes={{ 'data-recipe-command': 'fail' }}
              >
                Simulate Failure
              </ToolbarButton>
              <ToolbarButton
                action="recipe-action"
                rootAttributes={{ 'data-recipe-command': 'refresh' }}
              >
                Refresh
              </ToolbarButton>
            </ToolbarControlGroup>
          }
        />
      }
    >
      {renderBody()}
    </Pane>
  );
  return {
    render,
    action(command) {
      const next: Record<string, ListState> = {
        load: 'populated',
        empty: 'empty',
        create: 'populated',
        fail: 'error',
        retry: 'populated',
        refresh: 'stale',
        finish: 'populated',
      };
      if (command in next) state.value = next[command]!;
      announce(`List state: ${state.value}`);
    },
  };
};

import '@kerfjs/ui/layout.css';

import { EmptyState } from '@kerfjs/ui/empty-state';
import { ListItem } from '@kerfjs/ui/list-item';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
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
    <section aria-label="Release task list">
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
          title="Loading release tasks"
          detail="The current workspace will appear when data is ready."
          busy
          action={
            <button
              type="button"
              data-action="recipe-action"
              data-recipe-command="load"
            >
              Complete load
            </button>
          }
        />
      );
    if (state.value === 'empty')
      return (
        <EmptyState
          title="No release tasks"
          detail="Create the first task for this milestone."
          action={
            <button
              type="button"
              data-action="recipe-action"
              data-recipe-command="create"
            >
              Create task
            </button>
          }
        />
      );
    if (state.value === 'error')
      return (
        <StateBanner
          title="Release tasks could not be refreshed"
          detail="Existing filters are preserved. Try again when the connection recovers."
          tone="danger"
          urgency="alert"
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
            title="Showing saved results"
            detail="Refreshing in the background."
            tone="warning"
            action={
              <Row gap="xs" vAlign="middle">
                <LoadingSpinner label="Refreshing release tasks" />
                <button
                  type="button"
                  data-action="recipe-action"
                  data-recipe-command="finish"
                >
                  Finish refresh
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
      label="Release tasks"
      rootAttributes={{
        'data-recipe': 'recipe-list-workspace-states',
        'data-list-state': state.value,
      }}
      header={
        <Toolbar
          label="Release tasks"
          dividerSides=""
          responsive="stack"
          responsiveAt="compact"
          leading={
            <ToolbarText
              text="Release tasks"
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
              <button
                type="button"
                data-action="recipe-action"
                data-recipe-command="empty"
              >
                Clear
              </button>
              <button
                type="button"
                data-action="recipe-action"
                data-recipe-command="fail"
              >
                Simulate failure
              </button>
              <button
                type="button"
                data-action="recipe-action"
                data-recipe-command="refresh"
              >
                Refresh
              </button>
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

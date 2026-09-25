import '@kerfjs/ui/layout.css';
import './recipes.css';

import { EmptyState } from '@kerfjs/ui/empty-state';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { Pane } from '@kerfjs/ui/pane';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';

import type { RecipeFactory } from './types.js';

type ListState = 'loading' | 'empty' | 'populated' | 'stale' | 'error';
const items = [
  'Audit keyboard focus order',
  'Verify 200% zoom layout',
  'Publish package migration notes',
];

export const createRecipe: RecipeFactory = (announce) => {
  const state = signal<ListState>('loading');
  const populated = () => (
    <ul class="recipe-list__items" aria-label="Release tasks">
      {items.map((item, index) => (
        <li>
          <strong>{item}</strong>
          <span class="kui-recipe__muted">
            {index === 0
              ? 'In review · Mara'
              : index === 1
                ? 'Ready · Sam'
                : 'Draft · Inez'}
          </span>
        </li>
      ))}
    </ul>
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
              <span class="kui-inline-metadata">
                <LoadingSpinner label="Refreshing release tasks" />
                <button
                  type="button"
                  data-action="recipe-action"
                  data-recipe-command="finish"
                >
                  Finish refresh
                </button>
              </span>
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
      className="kui-recipe recipe-list kui-recipe__surface"
      contentClassName="recipe-list__body"
      rootAttributes={{
        'data-recipe': 'recipe-list-workspace-states',
        'data-list-state': state.value,
      }}
      header={
        <Toolbar
          label="Release tasks"
          dividerSides=""
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
      <Text class="kui-recipe__ownership kui-content-item">
        The recipe owns feedback placement and stable content. The app owns
        fetching, cache age, retry policy, and domain rows.
      </Text>
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

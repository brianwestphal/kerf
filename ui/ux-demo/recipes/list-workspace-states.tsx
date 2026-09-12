import '@kerfjs/ui/layout.css';
import './recipes.css';

import { EmptyState } from '@kerfjs/ui/empty-state';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { PageHeader } from '@kerfjs/ui/page-header';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { signal } from 'kerfjs';

import type { RecipeFactory } from './types.js';

type ListState = 'loading' | 'empty' | 'populated' | 'stale' | 'error';
const items = ['Audit keyboard focus order', 'Verify 200% zoom layout', 'Publish package migration notes'];

export const createRecipe: RecipeFactory = (announce) => {
  const state = signal<ListState>('loading');
  const populated = () => <ul class="recipe-list__items" aria-label="Release tasks">{items.map((item, index) => <li><strong>{item}</strong><span class="kui-recipe__muted">{index === 0 ? 'In review · Mara' : index === 1 ? 'Ready · Sam' : 'Draft · Inez'}</span></li>)}</ul>;
  const renderBody = () => {
    if (state.value === 'loading') return <EmptyState title="Loading release tasks" detail="The current workspace will appear when data is ready." busy action={<button class="kui-recipe__button" type="button" data-action="recipe-action" data-recipe-command="load">Complete load</button>} />;
    if (state.value === 'empty') return <EmptyState title="No release tasks" detail="Create the first task for this milestone." action={<button class="kui-recipe__button" data-primary="true" type="button" data-action="recipe-action" data-recipe-command="create">Create task</button>} />;
    if (state.value === 'error') return <div class="kui-section-stack"><StateBanner title="Release tasks could not be refreshed" detail="Existing filters are preserved. Try again when the connection recovers." tone="danger" urgency="alert" action={<button class="kui-recipe__button" type="button" data-action="recipe-action" data-recipe-command="retry">Retry</button>} /></div>;
    return <div class="kui-section-stack">{state.value === 'stale' && <StateBanner title="Showing saved results" detail="Refreshing in the background." tone="warning" action={<span class="kui-inline-metadata"><LoadingSpinner label="Refreshing release tasks" /><button class="kui-recipe__button" type="button" data-action="recipe-action" data-recipe-command="finish">Finish refresh</button></span>} />}{populated()}</div>;
  };
  const render = () => <section class="kui-recipe recipe-list kui-recipe__surface kui-layout" data-recipe="recipe-list-workspace-states" data-list-state={state.value}><PageHeader title="Release tasks" action={<div class="kui-control-cluster"><button class="kui-recipe__button" type="button" data-action="recipe-action" data-recipe-command="empty">Clear</button><button class="kui-recipe__button" type="button" data-action="recipe-action" data-recipe-command="fail">Simulate failure</button><button class="kui-recipe__button" data-primary="true" type="button" data-action="recipe-action" data-recipe-command="refresh">Refresh</button></div>} /><div class="recipe-list__body kui-scroll-owner kui-pane-body">{renderBody()}<p class="kui-recipe__ownership">The recipe owns feedback placement and stable content. The app owns fetching, cache age, retry policy, and domain rows.</p></div></section>;
  return { render, action(command) { const next: Record<string, ListState> = { load: 'populated', empty: 'empty', create: 'populated', fail: 'error', retry: 'populated', refresh: 'stale', finish: 'populated' }; if (command in next) state.value = next[command]!; announce(`List state: ${state.value}`); } };
};

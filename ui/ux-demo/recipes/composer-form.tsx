import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/select/register';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
import './recipes.css';

import { Select } from '@kerfjs/ui/select';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { signal } from 'kerfjs';

import type { RecipeFactory } from './types.js';

export const createRecipe: RecipeFactory = (announce) => {
  const title = signal('');
  const body = signal('The tablet layout now keeps navigation, content, and inspector focus order aligned.');
  const audience = signal('team');
  const status = signal<'idle' | 'error' | 'saved'>('idle');
  const render = () => <form class="kui-recipe recipe-form kui-recipe__surface kui-page-gutter kui-layout kui-section-stack" data-recipe="recipe-composer-form" noValidate>
    <div><h2>Publish workspace update</h2><p class="kui-recipe__muted">Share a concise, actionable update with collaborators.</p></div>
    {status.value === 'error' && <StateBanner title="Add a title before publishing" detail="The update body and audience are preserved." tone="danger" urgency="alert" />}
    {status.value === 'saved' && <StateBanner title="Update published" detail="The team audience can now read it." tone="success" />}
    <div class="recipe-form__fields">
      <wa-input name="recipe-title" label="Update title" hint="Summarize the outcome in one line." required value={title.value}></wa-input>
      <wa-textarea name="recipe-body" label="Details" hint="Include decisions, owners, and the next checkpoint." rows="5" maxlength="400" with-count value={body.value}></wa-textarea>
      <Select name="recipe-audience" value={audience.value} label="Audience" choices={[{ value: 'team', label: 'Workspace team' }, { value: 'reviewers', label: 'Reviewers' }, { value: 'organization', label: 'Entire organization' }]} />
    </div>
    <div class="kui-control-cluster"><wa-button appearance="outlined" data-action="recipe-action" data-recipe-command="reset">Reset</wa-button><wa-button variant="brand" appearance="accent" data-action="recipe-action" data-recipe-command="submit">Publish update</wa-button></div>
    <p class="kui-recipe__ownership">The recipe owns field, message, and action rhythm. The app owns validation rules, draft persistence, permissions, and transport.</p>
  </form>;
  return {
    render,
    action(command) {
      if (command === 'reset') { title.value = ''; body.value = ''; status.value = 'idle'; announce('Draft reset'); return; }
      if (command === 'submit') { status.value = title.value.trim() ? 'saved' : 'error'; announce(status.value === 'saved' ? 'Update published' : 'Title required'); }
    },
    change(element) {
      const value = (element as HTMLElement & { value?: string | null }).value ?? '';
      if (element.getAttribute('name') === 'recipe-title') title.value = value;
      if (element.getAttribute('name') === 'recipe-body') body.value = value;
      if (element.getAttribute('name') === 'recipe-audience') audience.value = value;
    },
  };
};

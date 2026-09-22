import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/select/register';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
import './recipes.css';

import { Select } from '@kerfjs/ui/select';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';

import type { RecipeFactory } from './types.js';

type ValueField = HTMLElement & { value: string };

const syncControlledFieldValues = (
  action: HTMLElement,
  values: Record<string, string>,
) => {
  const form = action.closest<HTMLElement>(
    '[data-recipe="recipe-composer-form"]',
  );
  if (!form) return;
  for (const [name, value] of Object.entries(values)) {
    const field = form.querySelector<ValueField>(`[name="${name}"]`);
    if (field && field.value !== value) field.value = value;
  }
};

export const createRecipe: RecipeFactory = (announce) => {
  const title = signal('');
  const body = signal(
    'The tablet layout now keeps navigation, content, and inspector focus order aligned.',
  );
  const audience = signal('team');
  const status = signal<'idle' | 'error' | 'saved'>('idle');
  const render = () => (
    <form
      class="kui-recipe recipe-form kui-recipe__surface kui-content"
      data-recipe="recipe-composer-form"
      aria-labelledby="recipe-composer-title"
      aria-describedby="recipe-composer-summary"
      noValidate
    >
      <Toolbar
        label="Publish workspace update"
        dividerSides=""
        leading={
          <ToolbarText
            text="Publish workspace update"
            size="xlarge"
            id="recipe-composer-title"
          />
        }
      />
      <p class="kui-recipe__heading-summary" id="recipe-composer-summary">
        Share a concise, actionable update with collaborators.
      </p>
      {status.value === 'error' && (
        <StateBanner
          title="Add a title before publishing"
          detail="The update body and audience are preserved."
          tone="danger"
          urgency="alert"
        />
      )}
      {status.value === 'saved' && (
        <StateBanner
          title="Update published"
          detail="The team audience can now read it."
          tone="success"
        />
      )}
      <div class="recipe-form__section recipe-form__fields">
        <wa-input
          name="recipe-title"
          label="Update title"
          hint="Summarize the outcome in one line."
          required
          value={title.value}
        ></wa-input>
        <wa-textarea
          name="recipe-body"
          label="Details"
          hint="Include decisions, owners, and the next checkpoint."
          rows="5"
          maxlength="400"
          with-count
          value={body.value}
        ></wa-textarea>
        <Select<string>
          name="recipe-audience"
          value={audience.value}
          label="Audience"
          choices={[
            { value: 'team', label: 'Workspace team' },
            { value: 'reviewers', label: 'Reviewers' },
            { value: 'organization', label: 'Entire organization' },
          ]}
        />
      </div>
      <footer class="recipe-form__section recipe-form__footer">
        <div class="recipe-form__actions kui-control-cluster">
          <wa-button
            appearance="outlined"
            data-action="recipe-action"
            data-recipe-command="reset"
          >
            Reset
          </wa-button>
          <wa-button
            variant="brand"
            appearance="accent"
            data-action="recipe-action"
            data-recipe-command="submit"
          >
            Publish update
          </wa-button>
        </div>
        <p class="kui-recipe__ownership">
          The recipe owns field, message, and action rhythm. The app owns
          validation rules, draft persistence, permissions, and transport.
        </p>
      </footer>
    </form>
  );
  return {
    render,
    action(command, element) {
      if (command === 'reset') {
        title.value = '';
        body.value = '';
        status.value = 'idle';
        syncControlledFieldValues(element, {
          'recipe-title': title.value,
          'recipe-body': body.value,
        });
        announce('Draft reset');
        return;
      }
      if (command === 'submit') {
        status.value = title.value.trim() ? 'saved' : 'error';
        announce(
          status.value === 'saved' ? 'Update published' : 'Title required',
        );
      }
    },
    change(element) {
      const value =
        (element as HTMLElement & { value?: string | null }).value ?? '';
      if (element.getAttribute('name') === 'recipe-title') title.value = value;
      if (element.getAttribute('name') === 'recipe-body') body.value = value;
      if (element.getAttribute('name') === 'recipe-audience')
        audience.value = value;
    },
  };
};

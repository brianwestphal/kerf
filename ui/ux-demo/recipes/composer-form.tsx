import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/select/register';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';

import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { Row } from '@kerfjs/ui/row';
import { Select } from '@kerfjs/ui/select';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';

import type { RecipeFactory, RecipePresentation } from './types.js';

export const presentation: RecipePresentation = {
  viewport: {
    width: 'medium',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: 'The recipe owns field, message, and action rhythm. The app owns validation rules, draft persistence, permissions, and transport.',
};

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
      data-recipe="recipe-composer-form"
      aria-labelledby="recipe-composer-title"
      aria-describedby="recipe-composer-summary"
      noValidate
    >
      <List gap="l" controlInsets="tb">
        {/* The title and its supporting line are one heading unit. */}
        <List>
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
          <ListInsetText sides="rl">
            <Text variant="span" tone="quiet" id="recipe-composer-summary">
              Share a concise, actionable update with collaborators.
            </Text>
          </ListInsetText>
        </List>
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
        <List gap="xs" controlInsets="rl">
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
        </List>
        <Row gap="xs" wrap controlInsets="rl">
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
        </Row>
      </List>
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

import '@kerfjs/ui/layout.css';

import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

import type { RecipeFactory, RecipePresentation } from './types.js';

export const presentation: RecipePresentation = {
  viewport: {
    width: 'full',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: 'The recipe owns page hierarchy and action relocation. The app owns authorization, command behavior, breadcrumbs, and product copy.',
};

export const createRecipe: RecipeFactory = (announce) => ({
  render: () => (
    <section
      data-recipe="recipe-workspace-header"
      aria-labelledby="recipe-workspace-title"
    >
      <List gap="l" controlInsets="tb">
        <List>
          <ListInsetText sides="rl">
            <Text variant="span" tone="quiet" size="compact">
              Northstar workspace · Product planning
            </Text>
          </ListInsetText>
          <Toolbar
            label="Workspace heading"
            dividerSides=""
            responsive="stack"
            responsiveAt="compact"
            leading={
              <ToolbarText
                text="Accessibility readiness and responsive navigation rollout"
                size="xlarge"
                id="recipe-workspace-title"
                headingLevel={1}
                wrap
                maxLines={2}
              />
            }
            trailing={
              <ToolbarControlGroup
                appearance="borderless"
                buttonAppearance="push"
                content="text"
              >
                <button
                  type="button"
                  data-action="recipe-action"
                  data-recipe-command="share"
                >
                  Share
                </button>
                <button
                  type="button"
                  data-action="recipe-action"
                  data-recipe-command="more"
                >
                  More actions
                </button>
                <button
                  type="button"
                  data-action="recipe-action"
                  data-recipe-command="publish"
                >
                  Publish update
                </button>
              </ToolbarControlGroup>
            }
          />
        </List>
        <StateBanner
          title="Ready for review"
          detail="All required checks passed 18 minutes ago."
          tone="success"
        />
      </List>
    </section>
  ),
  action(command) {
    announce(`${command} requested`);
  },
});

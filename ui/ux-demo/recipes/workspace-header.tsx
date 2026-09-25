import '@kerfjs/ui/layout.css';
import './workspace-header.css';

import { StateBanner } from '@kerfjs/ui/state-banner';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

import { RecipeOwnershipNote, RecipeRoot } from './recipe-root.js';
import type { RecipeFactory } from './types.js';

export const createRecipe: RecipeFactory = (announce) => ({
  render: () => (
    <RecipeRoot recipe="recipe-workspace-header">
      <div class="recipe-header kui-content">
        <p class="recipe-header__context kui-inline-metadata kui-content-item">
          <span>Northstar workspace</span>
          <span>·</span>
          <span>Product planning</span>
        </p>
        <Toolbar
          label="Workspace heading"
          dividerSides=""
          leading={
            <ToolbarText
              text="Accessibility readiness and responsive navigation rollout"
              size="xlarge"
              id="recipe-workspace-title"
              headingLevel={1}
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
        <StateBanner
          title="Ready for review"
          detail="All required checks passed 18 minutes ago."
          tone="success"
        />
        <RecipeOwnershipNote>
          The recipe owns page hierarchy and action relocation. The app owns
          authorization, command behavior, breadcrumbs, and product copy.
        </RecipeOwnershipNote>
      </div>
    </RecipeRoot>
  ),
  action(command) {
    announce(`${command} requested`);
  },
});

import { Pane } from '@kerfjs/ui/pane';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

import { button } from './state.js';

export function LayoutDemo() {
  return (
    <Pane
      className="demo-layout"
      contentElement="section"
      rootAttributes={{ 'data-demo': 'layout' }}
      header={
        <Toolbar
          label="Semantic layout"
          dividerSides=""
          leading={
            <ToolbarText
              text="Semantic layout"
              size="xlarge"
              id="layout-title"
            />
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              {button('New item', 'log-add')}
            </ToolbarControlGroup>
          }
        />
      }
    >
      <div class="demo-layout__surface kui-content-item">
        <Text>
          <strong>One owner per item</strong>
        </Text>
        <Text>
          Each content child owns its margin, border, background, padding, and
          radius.
        </Text>
      </div>
      <div class="demo-layout__actions kui-control-cluster">
        {button('Primary action', 'log-add')}
        {button('Secondary action', 'log-more')}
      </div>
      <div class="kui-inline-metadata kui-content-item">
        <span>24px major rhythm</span>
        <span>·</span>
        <span>8px internal rhythm</span>
      </div>
    </Pane>
  );
}

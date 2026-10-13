import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { IconToggleButton } from '@kerfjs/ui/icon-toggle-button';
import { Row } from '@kerfjs/ui/row';
import { MessageSquare, PanelRight } from 'lucide';

import { iconToggleConversationOpen } from './state.js';

export function IconToggleButtonDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'icon-toggle-button' }}>
      <CatalogExample
        label="Standalone Toggle"
        note="A native aria-pressed button with a single contained toolbar group's geometry, for content and pane footers. Click it to toggle."
        align="inline-control"
      >
        <IconToggleButton
          icon={MessageSquare}
          iconName="message-square"
          label="Show Conversation"
          pressed={iconToggleConversationOpen.value}
          action="toggle-icon-toggle-demo"
        />
      </CatalogExample>
      <CatalogExample label="Shapes and States" align="inline-control">
        <Row>
          <IconToggleButton
            icon={PanelRight}
            iconName="panel-right"
            label="Inspector (Rounded, Pressed)"
            pressed
            shape="rounded"
          />
          <IconToggleButton
            icon={PanelRight}
            iconName="panel-right"
            label="Inspector (Rounded)"
            pressed={false}
            shape="rounded"
          />
          <IconToggleButton
            icon={PanelRight}
            iconName="panel-right"
            label="Inspector (Disabled)"
            pressed={false}
            disabled
          />
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

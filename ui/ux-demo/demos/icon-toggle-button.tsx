import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { IconToggleButton } from '@kerfjs/ui/icon-toggle-button';
import { Row } from '@kerfjs/ui/row';
import { MessageSquare, PanelRight } from 'lucide';

import { iconToggleConversationOpen } from './state.js';

export function IconToggleButtonDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'icon-toggle-button' }}>
      <CatalogExample
        label="Standalone toggle"
        note="A native aria-pressed button with a single contained toolbar group's geometry, for content and pane footers. Click it to toggle."
        align="inline-control"
      >
        <IconToggleButton
          icon={MessageSquare}
          iconName="message-square"
          label="Show conversation"
          pressed={iconToggleConversationOpen.value}
          action="toggle-icon-toggle-demo"
        />
      </CatalogExample>
      <CatalogExample label="Shapes and states" align="inline-control">
        <Row>
          <IconToggleButton
            icon={PanelRight}
            iconName="panel-right"
            label="Inspector (rounded, pressed)"
            pressed
            shape="rounded"
          />
          <IconToggleButton
            icon={PanelRight}
            iconName="panel-right"
            label="Inspector (rounded)"
            pressed={false}
            shape="rounded"
          />
          <IconToggleButton
            icon={PanelRight}
            iconName="panel-right"
            label="Inspector (disabled)"
            pressed={false}
            disabled
          />
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

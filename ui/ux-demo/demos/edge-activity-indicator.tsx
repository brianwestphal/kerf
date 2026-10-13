import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { EdgeActivityIndicator } from '@kerfjs/ui/edge-activity-indicator';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';

import { edgeActivityBusy, edgeActivityMessage } from './state.js';

export function EdgeActivityIndicatorDemo() {
  return (
    <CatalogExampleStack
      rootAttributes={{ 'data-demo': 'edge-activity-indicator' }}
    >
      <CatalogExample
        label="Top-Edge Activity"
        note="The strip pins to the top of the page and allocates no layout. Start the activity to see the wave and the optional status pill; it stops when you leave this demo."
        align="inline-control"
      >
        <ToolbarControlGroup label="Edge Activity">
          <button
            type="button"
            aria-pressed={edgeActivityBusy.value ? 'true' : 'false'}
            data-action="toggle-edge-activity-demo"
          >
            {edgeActivityBusy.value ? 'Stop Activity' : 'Start Activity'}
          </button>
          <button
            type="button"
            aria-pressed={edgeActivityMessage.value ? 'true' : 'false'}
            data-action="toggle-edge-activity-message-demo"
          >
            Status Pill
          </button>
        </ToolbarControlGroup>
        <EdgeActivityIndicator
          busy={edgeActivityBusy.value}
          message={
            edgeActivityMessage.value ? 'Syncing 3 providers…' : undefined
          }
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { SplitButton } from '@kerfjs/ui/split-button';
import { Play, Rocket } from 'lucide';

import { splitButtonOptionsOpen, splitButtonRunning } from './state.js';

export function SplitButtonDemo() {
  const running = splitButtonRunning.value;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'split-button' }}>
      <CatalogExample
        label="Full-Width Primary Action"
        note="Click the primary half to start or stop; the app switches the tone to neutral and marks it busy while running. The options trigger reports aria-expanded for the app's own menu."
        viewport={{ width: 'compact' }}
      >
        <SplitButton
          label={running ? 'Codex Running' : 'Drive with Codex'}
          action="toggle-split-button-demo"
          icon={<LucideIcon icon={Play} name="play" />}
          optionsLabel="Choose Drive Provider, Model, and Effort"
          optionsAction="toggle-split-button-options-demo"
          optionsExpanded={splitButtonOptionsOpen.value}
          tone={running ? 'neutral' : 'success'}
          busy={running}
          fill
        />
      </CatalogExample>
      <CatalogExample label="Tones and States" align="inline-control">
        <Row wrap>
          <SplitButton
            label="Deploy"
            action="log-deploy"
            icon={<LucideIcon icon={Rocket} name="rocket" />}
            optionsLabel="Deploy Options"
            optionsAction="log-deploy-options"
          />
          <SplitButton
            label="Delete"
            action="log-delete"
            optionsLabel="Delete Options"
            optionsAction="log-delete-options"
            tone="danger"
          />
          <SplitButton
            label="Publish"
            action="log-publish"
            optionsLabel="Publish Options"
            optionsAction="log-publish-options"
            disabled
            title="Nothing to publish"
          />
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

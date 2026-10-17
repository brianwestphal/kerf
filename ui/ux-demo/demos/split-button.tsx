import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { SplitButton } from '@kerfjs/ui/split-button';
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
import { Download, Play, Rocket } from 'lucide';

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
        <ListInsetControl sides="rl">
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
        </ListInsetControl>
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
      <CatalogExample
        label="Pill Shape"
        note="The pill shape fully rounds both outer ends, as on Button; the divider between the halves stays square."
        align="inline-control"
      >
        <Row wrap>
          <SplitButton
            shape="pill"
            label="Export"
            action="log-split-button-pill"
            icon={<LucideIcon icon={Download} name="download" />}
            optionsLabel="Export Formats"
            optionsAction="log-split-button-pill-options"
          />
          <SplitButton
            shape="pill"
            label="Run Checks"
            action="log-split-button-pill"
            optionsLabel="Check Options"
            optionsAction="log-split-button-pill-options"
            tone="neutral"
          />
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Inside a Clipping Container"
        note="focusRingInset keeps each half's focus ring inside its box when an ancestor clips overflow, as this frame does. A surface-colored line inside the ring keeps it visible on every loud fill. Focus a half to see it."
        align="inline-control"
        viewport={{ overflow: 'hidden' }}
      >
        <Row wrap rootAttributes={{ 'data-demo-section': 'focus-ring-inset' }}>
          <SplitButton
            focusRingInset
            label="Sync"
            action="log-split-button-pill"
            optionsLabel="Sync Options"
            optionsAction="log-split-button-pill-options"
          />
          <SplitButton
            focusRingInset
            label="Archive"
            action="log-split-button-pill"
            optionsLabel="Archive Options"
            optionsAction="log-split-button-pill-options"
            tone="neutral"
          />
          <SplitButton
            focusRingInset
            label="Purge"
            action="log-split-button-pill"
            optionsLabel="Purge Options"
            optionsAction="log-split-button-pill-options"
            tone="danger"
          />
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Inset Ring on a Sunken Surface"
        note="The line inside each inset ring paints the surface the button sits on, so on a sunken or tinted surface it reads as a cut through the fill rather than a light halo."
        align="inline-control"
        viewport={{ overflow: 'hidden' }}
      >
        <SunkenPanel ariaLabel="Sunken Split Actions">
          <Row
            wrap
            rootAttributes={{ 'data-demo-section': 'focus-ring-inset-sunken' }}
          >
            <SplitButton
              focusRingInset
              label="Sync"
              action="log-split-button-pill"
              optionsLabel="Sync Options"
              optionsAction="log-split-button-pill-options"
            />
            <SplitButton
              focusRingInset
              label="Purge"
              action="log-split-button-pill"
              optionsLabel="Purge Options"
              optionsAction="log-split-button-pill-options"
              tone="danger"
            />
          </Row>
        </SunkenPanel>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

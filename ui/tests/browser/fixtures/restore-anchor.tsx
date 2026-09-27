import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/floating-toolbar.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/resizable-region.css';

import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '@kerfjs/ui/collapsible-panel';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { Pane } from '@kerfjs/ui/pane';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { mount, signal } from 'kerfjs';

/**
 * Collapsed CollapsiblePanel / ResizableRegion instances that carry a
 * `restoreControl`, in two placements: embedded in a scrolling page between
 * unrelated content (`embedded`), and as a full-viewport app shell
 * (`viewport`). The restore control must float in a corner of the component's
 * own container in both, never in a corner of the viewport.
 */
type Scenario = 'embedded' | 'viewport';

const scenario = signal<Scenario>('embedded');

const content = (title: string) => (
  <Pane>
    <div class="kui-content">
      <div class="kui-content-item">{title}</div>
    </div>
  </Pane>
);

/** Host content that fills the rest of its flex container. */
const fill = (title: string) => (
  <div style="display:flex;flex:1 1 0;min-width:0;min-height:0">
    {content(title)}
  </div>
);

const panel = () => (
  <CollapsiblePanel
    id="restore-nav"
    side="left"
    collapsed
    label="Navigator"
    restoreControl={
      <CollapsiblePanelToggle
        side="left"
        collapsed
        action="toggle-restore-nav"
        label="Show navigator"
      />
    }
  >
    {content('Navigator')}
  </CollapsiblePanel>
);

const region = () => (
  <ResizableRegion
    id="restore-console"
    label="Console"
    axis="vertical"
    edge="start"
    size={120}
    min={80}
    max={200}
    collapsed
    restoreControl={
      <FloatingToolbar label="Console" position="bottom-end">
        <ToolbarControlGroup label="Console" single>
          <CollapsiblePanelToggle
            side="bottom"
            collapsed
            action="toggle-restore-console"
            label="Show console"
          />
        </ToolbarControlGroup>
      </FloatingToolbar>
    }
  >
    {content('Console')}
  </ResizableRegion>
);

const intro = (
  <p data-page-text="intro" style="margin:0;height:160px">
    Unrelated page content above the components.
  </p>
);

const view = () =>
  scenario.value === 'embedded' ? (
    <main style="display:grid;gap:24px;padding:24px">
      {intro}
      <div
        data-restore-host="panel"
        style="display:flex;height:240px;overflow:hidden;outline:1px dashed var(--kui-color-border)"
      >
        {panel()}
        {fill('Panel host content')}
      </div>
      <div
        data-restore-host="region"
        style="display:flex;flex-direction:column;height:240px;overflow:hidden;outline:1px dashed var(--kui-color-border)"
      >
        {fill('Region host content')}
        {region()}
      </div>
      <p data-page-text="footer" style="margin:0;height:1200px">
        Unrelated page content below the components.
      </p>
    </main>
  ) : (
    <div
      data-restore-host="viewport"
      style="display:flex;height:100vh;height:100dvh"
    >
      {panel()}
      <div style="display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden">
        {fill('App content')}
        {region()}
      </div>
    </div>
  );

mount(document.querySelector<HTMLElement>('[data-restore-fixture]')!, view);

(globalThis as unknown as Record<string, unknown>).restoreFixture = {
  show(value: Scenario) {
    scenario.value = value;
  },
};

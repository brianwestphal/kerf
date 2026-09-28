import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/resizable-region.css';

import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '@kerfjs/ui/collapsible-panel';
import { ContentItem } from '@kerfjs/ui/content-item';
import { deviceClass } from '@kerfjs/ui/device-class';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { wireSidebar } from '@kerfjs/ui/wire-sidebar';
import { delegate, mount, signal } from 'kerfjs';

/**
 * A collapsible left rail (CollapsiblePanel + wireSidebar, compact overlay
 * below the tablet breakpoint) beside a work area, above a collapsible
 * ResizableRegion bottom drawer whose collapse the app owns. Each panel holds
 * focusable controls, so a Tab walk can prove none is reachable while its
 * panel is collapsed.
 */
const device = deviceClass();
const navCollapsed = signal(device.value.compact);
const outputCollapsed = signal(false);

const navToggle = () => (
  <CollapsiblePanelToggle
    side="left"
    collapsed={navCollapsed.value}
    action="toggle-nav"
    panelId="nav"
    label={navCollapsed.value ? 'Show navigator' : 'Hide navigator'}
  />
);

const view = () => (
  <div style="display:flex;flex-direction:column;height:100vh">
    <div style="display:flex;flex:1;min-height:0;position:relative">
      <CollapsiblePanel
        id="nav"
        side="left"
        size={240}
        label="Navigator"
        collapsed={navCollapsed.value}
      >
        <div class="kui-content">
          <ContentItem>
            {navToggle()}
            <button type="button">Inbox</button>
            <button type="button">Projects</button>
          </ContentItem>
        </div>
      </CollapsiblePanel>
      <main style="flex:1;min-width:0">
        <div class="kui-content">
          <ContentItem>
            <button type="button">Before</button>
            {navCollapsed.value ? navToggle() : null}
            <button type="button">After</button>
          </ContentItem>
        </div>
      </main>
    </div>
    <div style="display:flex;flex-direction:column;position:relative">
      <ResizableRegion
        id="output"
        label="Output"
        axis="vertical"
        edge="start"
        size={160}
        min={80}
        max={300}
        collapsed={outputCollapsed.value}
        restoreControl={
          <button type="button" data-action="toggle-output">
            Show output
          </button>
        }
      >
        <div class="kui-content">
          <ContentItem>
            <button type="button" data-action="toggle-output">
              Hide output
            </button>
            <button type="button">Clear output</button>
          </ContentItem>
        </div>
      </ResizableRegion>
    </div>
  </div>
);

const host = document.querySelector<HTMLElement>('[data-inert-host]')!;
mount(host, view);
wireSidebar(host, {
  deviceClass: device,
  panels: [
    {
      id: 'nav',
      collapsed: navCollapsed,
      toggleAction: 'toggle-nav',
      inlineCollapsed: false,
    },
  ],
});
// The app owns the region's collapse and its focus hand-off: the control that
// was pressed leaves with the content, so focus moves to its counterpart.
delegate(host, 'click', '[data-action="toggle-output"]', () => {
  outputCollapsed.value = !outputCollapsed.value;
  const name = outputCollapsed.value ? 'Show output' : 'Hide output';
  [...host.querySelectorAll<HTMLElement>('[data-action="toggle-output"]')]
    .find((button) => button.textContent?.trim() === name)
    ?.focus();
});

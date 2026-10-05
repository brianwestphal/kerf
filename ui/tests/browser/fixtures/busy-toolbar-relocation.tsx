import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/row.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/text.css';
import '@kerfjs/ui/resizable-region.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/loading-spinner.css';

import {
  CollapsiblePanel,
  CollapsiblePanelRelocated,
} from '@kerfjs/ui/collapsible-panel';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireSidebar } from '@kerfjs/ui/wire-sidebar';
import { mount, signal } from 'kerfjs';
import { Download } from 'lucide';

const collapsed = signal(false);
const busy = signal(false);
const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
root.dataset.exportCount = '0';
mount(root, () => {
  const toolbar = {
    label: 'Navigator actions',
    title: <ToolbarText text="Navigator" />,
    trailing: (
      <ToolbarControlGroup
        label="Export"
        single
        busy={busy.value}
        busyLabel="Exporting files"
        relocateOnCollapse
      >
        <button type="button" aria-label="Export files" data-export>
          <LucideIcon icon={Download} name="download" />
        </button>
      </ToolbarControlGroup>
    ),
    toggle: { action: 'toggle-navigator', name: 'navigator' },
  };
  return (
    <List fill>
      <Toolbar
        label="Work state"
        leading={
          <ToolbarControlGroup content="text" single>
            <button type="button" data-toggle-busy>
              {busy.value ? 'Finish export' : 'Start export'}
            </button>
          </ToolbarControlGroup>
        }
      />
      <Row flex gap="none">
        <CollapsiblePanel
          id="busy-nav"
          side="left"
          size={220}
          label="Navigator"
          collapsed={collapsed.value}
          toolbar={toolbar}
        >
          <Text>Project files</Text>
        </CollapsiblePanel>
        <List flex>
          <Pane
            header={
              <Toolbar
                label="Editor"
                leading={
                  <>
                    <CollapsiblePanelRelocated
                      panelId="busy-nav"
                      side="left"
                      collapsed={collapsed.value}
                      toolbar={toolbar}
                    />
                    <ToolbarText text="Editor" />
                  </>
                }
              />
            }
          >
            <Text>Export stays available when the navigator closes.</Text>
          </Pane>
        </List>
      </Row>
    </List>
  );
});
wireSidebar(root, {
  panels: [{ id: 'busy-nav', collapsed, toggleAction: 'toggle-navigator' }],
});
root.addEventListener('click', (event) => {
  const target = event.target as Element;
  if (target.closest('[data-toggle-busy]')) busy.value = !busy.value;
  if (target.closest('[data-export]'))
    root.dataset.exportCount = String(
      Number(root.dataset.exportCount ?? '0') + 1,
    );
});

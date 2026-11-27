import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/button.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/floating-toolbar.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/text-field.css';
import '@kerfjs/ui/text.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/workbench.css';

import { Button } from '@kerfjs/ui/button';
import { List } from '@kerfjs/ui/list';
import { Text } from '@kerfjs/ui/text';
import { TextField } from '@kerfjs/ui/text-field';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireWorkbench } from '@kerfjs/ui/wire-workbench';
import { Workbench, type WorkbenchStaticPanel } from '@kerfjs/ui/workbench';
import { mount, signal } from 'kerfjs';

const host = document.querySelector<HTMLElement>('[data-fixture-root]')!;
const active = signal(false);
const leftCollapsed = signal(false);
const rightCollapsed = signal(false);
const tickets = signal<string[]>([]);
const pop = () => {
  tickets.value = tickets.peek().slice(0, -1);
};

const inspector = (ticket: string): WorkbenchStaticPanel => ({
  label: 'Ticket Inspector',
  collapsed: rightCollapsed.value,
  responsiveOverlayAt: 'never',
  size: 230,
  toolbar: {
    label: 'Inspector tools',
    title: <ToolbarText text={ticket} />,
    toggle: { action: 'toggle-right', name: 'Inspector' },
  },
  header: <Text tone="quiet">Ticket details</Text>,
  pane: { contentLabel: 'Ticket details' },
  content: (
    <List gap="s" controlInsets="rl">
      <TextField
        id={`${ticket}-title`}
        label="Summary"
        value={ticket}
        size="compact"
      />
      {ticket === 'T-42' && (
        <Button action="open-T-43">Open Linked Ticket T-43</Button>
      )}
    </List>
  ),
});

wireWorkbench(host, {
  id: 'studio',
  panels: {
    leftRail: { collapsed: leftCollapsed },
    rightRail: { collapsed: rightCollapsed },
  },
  compactNavigation: { at: 500, active, onBack: pop },
});

mount(host, () => (
  <div style="height:100dvh;max-width:820px;margin-inline:auto">
    <Workbench
      id="studio"
      label="Ticket Workspace"
      mainLabel="Tickets"
      mainMinSize={0}
      mainToolbar={{
        label: 'Ticket tools',
        title: <ToolbarText text="Tickets" headingLevel={1} />,
        trailing: <Button action="filter">Filter</Button>,
      }}
      mainHeader={<Text tone="quiet">Project tickets and linked work</Text>}
      mainPane={{ contentLabel: 'Ticket list' }}
      main={
        <List gap="s" controlInsets="rl">
          <TextField id="draft" label="Draft Search" size="compact" />
          <Button action="open-T-42">Open Ticket T-42</Button>
        </List>
      }
      leftRail={{
        label: 'Projects',
        collapsed: leftCollapsed.value,
        responsiveOverlayAt: 'never',
        size: 170,
        toolbar: {
          label: 'Project tools',
          title: <ToolbarText text="Projects" />,
          toggle: { action: 'toggle-left', name: 'Projects' },
        },
        content: (
          <List controlInsets="rl">
            <Button action="choose-project">Workspace</Button>
          </List>
        ),
      }}
      rightRail={inspector('T-42')}
      bottomDrawer={{
        label: 'Terminal',
        size: 100,
        content: (
          <List>
            <Text weight="strong">Terminal</Text>
            <Text tone="quiet">Ready</Text>
          </List>
        ),
      }}
      compactNavigation={{
        active: active.value,
        views: tickets.value.map((ticket) => ({
          key: ticket,
          panel: inspector(ticket),
          title: ticket,
        })),
      }}
    />
  </div>
));

host.addEventListener('click', (event) => {
  const action = (event.target as Element)
    .closest('[data-action]')
    ?.getAttribute('data-action');
  if (action === 'toggle-left') leftCollapsed.value = !leftCollapsed.peek();
  if (action === 'toggle-right') rightCollapsed.value = !rightCollapsed.peek();
  if (action?.startsWith('open-')) {
    const ticket = action.slice('open-'.length);
    tickets.value = [...tickets.peek(), ticket];
  }
});

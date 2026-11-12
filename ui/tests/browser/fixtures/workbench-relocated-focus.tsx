import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/workbench.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/lucide-icon.css';

import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireWorkbench } from '@kerfjs/ui/wire-workbench';
import { Workbench } from '@kerfjs/ui/workbench';
import { mount, raw, signal } from 'kerfjs';
import { Filter, Megaphone } from 'lucide';

/**
 * A collapsed left rail relocates its Filter group (only while `filtering`)
 * and its Announcer group into the work area's toolbar. Focus the Announcer,
 * flip `filtering`, and the relocated set changes around it.
 */
const collapsed = signal(true);
const filtering = signal(true);
(window as unknown as { filtering: typeof filtering }).filtering = filtering;
const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
wireWorkbench(root, { id: 'app', panels: { leftRail: { collapsed } } });
mount(root, () =>
  Workbench({
    id: 'app',
    label: 'App',
    leftRail: {
      label: 'Projects',
      collapsed: collapsed.value,
      toolbar: {
        label: 'Projects Actions',
        title: <ToolbarText text="Projects" />,
        trailing: [
          filtering.value ? (
            <ToolbarControlGroup label="Filter" single relocateOnCollapse>
              <ToolbarButton
                ariaLabel="Filter"
                icon={<LucideIcon icon={Filter} name="filter" />}
              />
            </ToolbarControlGroup>
          ) : null,
          <ToolbarControlGroup label="Announcer" single relocateOnCollapse>
            <ToolbarButton
              ariaLabel="Announcer"
              icon={<LucideIcon icon={Megaphone} name="megaphone" />}
            />
          </ToolbarControlGroup>,
        ],
        toggle: { action: 'toggle-projects', name: 'Projects' },
      },
      content: raw('<p>Projects</p>'),
    },
    mainToolbar: {
      label: 'Tickets',
      title: <ToolbarText text="Tickets" />,
    },
    main: raw('<p>Tickets</p>'),
  }),
);

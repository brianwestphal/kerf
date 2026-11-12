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
import '@kerfjs/ui/search-field.css';
import '@kerfjs/ui/lucide-icon.css';

import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SearchField } from '@kerfjs/ui/search-field';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireSearchFields } from '@kerfjs/ui/wire-search-fields';
import { wireWorkbench } from '@kerfjs/ui/wire-workbench';
import { Workbench } from '@kerfjs/ui/workbench';
import { mount, raw, signal } from 'kerfjs';
import { Megaphone } from 'lucide';

/**
 * A Workbench whose collapsed left rail relocates an Announcer group (opted
 * into `yield-to-expanded-sibling`) and its toggle into the work area's
 * toolbar, beside an expandable trailing search. The relocated group gives
 * way while the search is open in a 480px-or-narrower toolbar; the toggle,
 * which does not opt in, stays.
 */
const collapsed = signal(true);
const searching = signal(false);
const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
wireWorkbench(root, { id: 'app', panels: { leftRail: { collapsed } } });
mount(root, () =>
  Workbench({
    id: 'app',
    label: 'App',
    leftRail: {
      label: 'Projects',
      collapsed: collapsed.value,
      responsiveOverlayAt: 'narrow',
      toolbar: {
        label: 'Projects Actions',
        title: <ToolbarText text="Projects" />,
        trailing: (
          <ToolbarControlGroup
            label="Announcer"
            single
            relocateOnCollapse
            visibility="yield-to-expanded-sibling"
          >
            <ToolbarButton
              ariaLabel="Announcer"
              icon={<LucideIcon icon={Megaphone} name="megaphone" />}
            />
          </ToolbarControlGroup>
        ),
        toggle: { action: 'toggle-projects', name: 'Projects' },
      },
      content: raw('<p>Projects</p>'),
    },
    mainToolbar: {
      label: 'Tickets',
      title: <ToolbarText text="Tickets" />,
      trailing: (
        <ToolbarControlGroup
          content="search"
          expanded={searching.value}
          single={!searching.value}
        >
          <SearchField
            id="ticket-search"
            label="Search Tickets"
            presentation="toolbar-group"
            collapsible
            expanded={searching.value}
            expandLabel="Search"
          />
        </ToolbarControlGroup>
      ),
    },
    main: raw('<p>Tickets</p>'),
  }),
);
wireSearchFields(root, {
  collapsible: { signals: { 'ticket-search': searching } },
});

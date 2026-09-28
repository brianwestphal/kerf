import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/workbench.css';
import '@kerfjs/ui/list.css';

import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { NavStack } from '@kerfjs/ui/nav-stack';
import { Toolbar, type ToolbarProps } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { Workbench } from '@kerfjs/ui/workbench';
import { mount } from 'kerfjs';
import { ChevronLeft, LayoutGrid, List, Share } from 'lucide';

/**
 * Toolbars whose leading identity, center group, and trailing group cannot all
 * fit at a phone width: the leading title must truncate and the center group
 * must keep its whole width without painting over it, under every responsive
 * policy and center alignment, and in the NavStack and Workbench toolbars that
 * render a real Toolbar.
 */
const iconButton = (label: string, icon: typeof List, name: string) => (
  <button type="button" aria-label={label}>
    <LucideIcon icon={icon} name={name} />
  </button>
);

const center = () => (
  <ToolbarControlGroup label="Project layout">
    {iconButton('List layout', List, 'list')}
    {iconButton('Grid layout', LayoutGrid, 'layout-grid')}
  </ToolbarControlGroup>
);

const trailing = () => (
  <ToolbarControlGroup label="Share" appearance="borderless" single>
    {iconButton('Share project', Share, 'share')}
  </ToolbarControlGroup>
);

const leading = () => (
  <>
    <ToolbarControlGroup
      appearance="borderless"
      shape="rounded"
      content="mixed"
      single
    >
      <button type="button">
        <LucideIcon icon={ChevronLeft} name="chevron-left" />
        <span>Library</span>
      </button>
    </ToolbarControlGroup>
    <ToolbarText text="Project Atlas roadmap" size="large" />
  </>
);

const policies: ToolbarProps['responsive'][] = [
  'none',
  'wrap',
  'stack',
  'center-priority',
];
const alignments: ToolbarProps['centerAlign'][] = ['center', 'stretch'];

function render() {
  return (
    <div style="display: grid; gap: 16px">
      {policies.flatMap((responsive) =>
        alignments.map((centerAlign) => (
          <div data-case={`${responsive}-${centerAlign}`}>
            <Toolbar
              label={`${responsive} ${centerAlign}`}
              responsive={responsive}
              responsiveAt="compact"
              centerAlign={centerAlign}
              leading={leading()}
              center={center()}
              trailing={trailing()}
            />
          </div>
        )),
      )}
      <div data-case="nav-stack" style="display: grid; height: 160px">
        <NavStack
          id="overflow-nav-stack"
          label="Projects"
          backText="Library"
          views={[
            { key: 'library', title: 'Library', content: <div /> },
            {
              key: 'atlas',
              title: 'Project Atlas roadmap',
              center: center(),
              toolbar: trailing(),
              content: <div />,
            },
          ]}
        />
      </div>
      <div data-case="workbench" style="display: grid; height: 200px">
        <Workbench
          id="overflow-workbench"
          label="Projects"
          mainToolbar={{
            label: 'Project',
            title: <ToolbarText text="Project Atlas roadmap" size="xlarge" />,
            center: center(),
            trailing: trailing(),
          }}
          main={<div />}
        />
      </div>
    </div>
  );
}

mount(document.querySelector<HTMLElement>('[data-fixture-root]')!, render);

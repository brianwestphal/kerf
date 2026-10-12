import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { Workbench } from '@kerfjs/ui/workbench';

const render = (collapsed: boolean) =>
  String(
    <div style="height:320px">
      <Workbench
        id={collapsed ? 'closed' : 'open'}
        label="Studio"
        main={<p>Main</p>}
        mainToolbar={{
          label: 'Editor',
          density: 'compact',
          title: <ToolbarText text="Editor" />,
          trailing: (
            <ToolbarControlGroup label="Run" size="compact" content="mixed">
              <button type="button">Run</button>
            </ToolbarControlGroup>
          ),
        }}
        leftRail={{
          label: 'Files',
          collapsed,
          content: <p>Files</p>,
          toolbar: {
            label: 'Files',
            density: 'compact',
            title: <ToolbarText text="Files" />,
            toggle: { action: 'toggle-files', name: 'files' },
          },
        }}
      />
    </div>,
  );

document.querySelector('[data-app]')!.innerHTML =
  `<section data-state="open">${render(false)}</section>` +
  `<section data-state="closed">${render(true)}</section>`;

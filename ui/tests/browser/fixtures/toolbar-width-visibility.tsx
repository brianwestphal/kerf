import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/toolbar-control-group.css';

import { px } from '@kerfjs/ui/css-values';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireToolbarVisibility } from '@kerfjs/ui/wire-toolbar-visibility';
import { mount, signal } from 'kerfjs';

const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
const renders = signal(0);
mount(root, () => (
  <main data-render={renders.value}>
    <div data-test-toolbar-host style="width:var(--fixture-width, 432px)">
      <Toolbar
        label="Width fixture"
        leading={<ToolbarText text="Workspace" hideBelow={px(176)} />}
        trailing={[
          <ToolbarControlGroup label="Primary" single>
            <button type="button" data-action="refresh">
              Refresh
            </button>
          </ToolbarControlGroup>,
          <ToolbarControlGroup label="Utilities" hideBelow={px(416)}>
            <button type="button" data-action="filter">
              Filter
            </button>
          </ToolbarControlGroup>,
          <ToolbarControlGroup label="More" showBelow={px(416)} single>
            <button type="button" data-action="more">
              More
            </button>
          </ToolbarControlGroup>,
          <ToolbarControlGroup
            label="Busy"
            hideBelow={px(416)}
            busy
            busyLabel="Saving workspace"
          >
            <button type="button">Save</button>
          </ToolbarControlGroup>,
        ]}
      />
    </div>
    <button type="button" data-rerender>
      Render again
    </button>
    <button type="button" data-dispose>
      Dispose visibility
    </button>
    <output data-test-result />
  </main>
));
const dispose = wireToolbarVisibility(root);
root.addEventListener('click', (event) => {
  const target = event.target as Element;
  if (target.closest('[data-rerender]')) renders.value++;
  if (target.closest('[data-dispose]')) dispose();
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action) root.querySelector('output')!.textContent = action;
});

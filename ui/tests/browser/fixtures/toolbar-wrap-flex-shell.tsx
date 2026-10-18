import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/toolbar-control-group.css';

import { List } from '@kerfjs/ui/list';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { mount, raw } from 'kerfjs';

// The documented shell: a filling List holding a wrapping Toolbar above a
// flex, scrollable List. The spec sets `kuiFixtureLong` to fill the scroller
// with a long page.
const long = Boolean(
  (globalThis as { kuiFixtureLong?: boolean }).kuiFixtureLong,
);
const rows = Array.from(
  { length: long ? 60 : 2 },
  (_, index) => `<p>Detail row ${index + 1}</p>`,
).join('');
const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
mount(root, () => (
  <div style="height:100vh">
    <List fill>
      <Toolbar
        label="Admin"
        responsive="wrap"
        leading={<ToolbarText text="Newsmonger Admin Console" size="xlarge" />}
        trailing={
          <ToolbarControlGroup label="Navigation" content="text">
            <button type="button">Back to Accounts</button>
          </ToolbarControlGroup>
        }
      />
      <List flex scrollable>
        {raw(rows)}
      </List>
    </List>
  </div>
));

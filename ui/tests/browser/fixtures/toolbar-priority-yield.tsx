import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/search-field.css';

import { SearchField } from '@kerfjs/ui/search-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireSearchFields } from '@kerfjs/ui/wire-search-fields';
import { mount, signal } from 'kerfjs';

// A trailing-priority app bar: the expanded search moves onto its own row at
// the compact width, and the Settings group yields while that row is active.
const open = signal(false);
const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
mount(root, () => (
  <Toolbar
    label="App"
    responsive="trailing-priority"
    responsiveAt="compact"
    leading={<ToolbarText text="News" size="xlarge" />}
    trailing={[
      <ToolbarControlGroup
        single
        content="search"
        expanded={open.value}
        sizing={open.value ? 'grow' : 'content'}
      >
        <SearchField
          id="app-search"
          label="Search Stories"
          presentation="toolbar-group"
          collapsible
          expanded={open.value}
          expandLabel="Open search"
        />
      </ToolbarControlGroup>,
      <ToolbarControlGroup
        single
        label="App"
        content="text"
        visibility="yield-to-priority-row"
      >
        <button type="button" data-settings>
          Settings
        </button>
      </ToolbarControlGroup>,
    ]}
  />
));
wireSearchFields(root, { collapsible: { signals: { 'app-search': open } } });

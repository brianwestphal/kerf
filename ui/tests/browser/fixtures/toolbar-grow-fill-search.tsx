import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/search-field.css';

import { rem } from '@kerfjs/ui/css-values';
import { SearchField } from '@kerfjs/ui/search-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireSearchFields } from '@kerfjs/ui/wire-search-fields';
import { mount, signal } from 'kerfjs';

// An app bar whose trailing zone holds a collapsible `fill` search in a
// `sizing="grow"` group beside a Settings group: opening the search must keep
// the grow basis, so Settings stays on the same row at a wide toolbar.
const open = signal(false);
const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
mount(root, () => (
  <Toolbar
    label="App"
    leading={<ToolbarText text="News" size="xlarge" />}
    trailing={[
      <ToolbarControlGroup
        single
        content="search"
        expanded={open.value}
        sizing={open.value ? 'grow' : 'content'}
        growBasis={rem(16)}
      >
        <SearchField
          id="app-search"
          label="Search Stories"
          presentation="toolbar-group"
          collapsible
          fill
          expanded={open.value}
          expandLabel="Open search"
        />
      </ToolbarControlGroup>,
      <ToolbarControlGroup single label="App" content="text">
        <button type="button" data-settings>
          Settings
        </button>
      </ToolbarControlGroup>,
    ]}
  />
));
wireSearchFields(root, { collapsible: { signals: { 'app-search': open } } });

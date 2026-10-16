import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SearchField } from '@kerfjs/ui/search-field';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { mount, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { CircleHelp } from 'lucide';

// One stateful help toggle per presentation, each with text so the clear
// button renders beside it. No application CSS: the field owns the button.
const open = signal<string | null>(null);
const root = document.querySelector<HTMLElement>('[data-app]')!;

const help = (id: string) => ({
  icon: <LucideIcon icon={CircleHelp} name="circle-help" />,
  label: 'Search Help',
  action: 'toggle-help',
  expanded: open.value === id,
  haspopup: 'dialog' as const,
  attributes: { 'data-help-for': id },
});

mount(root, () => (
  <div style="display:grid;gap:24px;width:360px">
    <div data-case="standalone">
      <SearchField
        id="standalone-search"
        label="Standalone Search"
        query="status:open"
        trailingAction={help('standalone')}
      />
    </div>
    <div data-case="form-field">
      <SearchField
        id="form-search"
        label="Form Search"
        presentation="form-field"
        query="status:open"
        trailingAction={help('form-field')}
      />
    </div>
    <div data-case="toolbar-group">
      <ToolbarControlGroup content="search" expanded>
        <SearchField
          id="toolbar-search"
          label="Toolbar Search"
          collapsible
          expanded
          presentation="toolbar-group"
          query="status:open"
          trailingAction={help('toolbar-group')}
        />
      </ToolbarControlGroup>
    </div>
  </div>
));

delegateActions(root, 'click', {
  'toggle-help': (_event, element) => {
    const id = element.getAttribute('data-help-for');
    open.value = open.value === id ? null : id;
  },
});

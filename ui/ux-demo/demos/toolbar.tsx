import { TokenSearchField } from '@kerfjs/ui/token-search-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { CircleHelp, Settings, SlidersHorizontal } from 'lucide';

import { button, icon, toolbarFindOpen, toolbarFindQuery } from './state.js';

export function ToolbarDemo() {
  const findExpanded =
    toolbarFindOpen.value || toolbarFindQuery.value.length > 0;
  return (
    <div class="demo-frame" data-demo="toolbar">
      <Toolbar
        label="Document controls"
        className="demo-toolbar-find-row"
        leading={
          <ToolbarControlGroup appearance="borderless" single>
            <ToolbarText text="Component library" size="large" />
          </ToolbarControlGroup>
        }
        center={
          <ToolbarControlGroup
            className="demo-toolbar-find"
            expanded={findExpanded}
            single={!findExpanded}
          >
            <TokenSearchField
              id="toolbar-find"
              label="Find in workspace"
              query={toolbarFindQuery.value}
              collapsible
              expanded={toolbarFindOpen.value}
              placeholder="Find in workspace"
              className="demo-toolbar-find-field"
              expandLabel="Open find"
              clearAction="clear-toolbar-find"
              editorAttributes={{ 'data-demo-toolbar-find': 'true' }}
              trailing={icon(CircleHelp, 'circle-help')}
            />
          </ToolbarControlGroup>
        }
        trailing={
          <ToolbarControlGroup label="View controls" buttonAppearance="push">
            <button
              type="button"
              aria-label="Toggle inspector"
              aria-pressed="true"
            >
              {icon(SlidersHorizontal, 'sliders-horizontal')}
            </button>
            <button type="button" aria-label="Settings">
              {icon(Settings, 'settings')}
            </button>
          </ToolbarControlGroup>
        }
      />
      <Toolbar
        label="Compact toolbar"
        dividerSides="trbl"
        leading={
          <ToolbarControlGroup appearance="borderless" single>
            <ToolbarText text="Borderless" size="small" />
          </ToolbarControlGroup>
        }
        trailing={
          <ToolbarControlGroup appearance="borderless" single>
            {button('Add', 'log-add')}
          </ToolbarControlGroup>
        }
      />
    </div>
  );
}

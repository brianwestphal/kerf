import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { Wrench } from 'lucide';

import { button, icon } from './state.js';

export function HeadersDemo() {
  // Page and panel headings are direct Toolbar compositions: identity in the
  // leading zone, actions in the trailing zone, and optional supporting copy
  // as ordinary content below the toolbar.
  return (
    <div class="demo-frame" data-demo="headers">
      <Toolbar
        label="UI foundations"
        dividerSides=""
        leading={
          <ToolbarText
            text="UI foundations"
            size="xlarge"
            id="headers-page-title"
            headingLevel={1}
          />
        }
        trailing={
          <ToolbarControlGroup appearance="borderless" single>
            {button('New pattern', 'log-add')}
          </ToolbarControlGroup>
        }
      />
      <Toolbar
        label="Package details"
        dividerSides=""
        leading={
          <>
            <ToolbarControlGroup appearance="borderless" single>
              {icon(Wrench, 'wrench')}
            </ToolbarControlGroup>
            <ToolbarText
              text="Package details"
              size="xlarge"
              id="headers-panel-title"
            />
          </>
        }
        trailing={
          <ToolbarControlGroup appearance="borderless" single>
            {button('Done', 'log-done')}
          </ToolbarControlGroup>
        }
      />
      <p class="kui-inline-metadata" id="headers-panel-summary">
        Production-backed primitives with explicit contracts.
      </p>
      <div class="kui-content">
        <ValueTable label="Package metadata">
          <ValueTableRow label="Package" value="@kerfjs/ui" />
          <ValueTableRow label="Rendering" value="Kerf SafeHtml" />
          <ValueTableRow label="Styles" value="Explicit CSS subpaths" />
        </ValueTable>
      </div>
    </div>
  );
}

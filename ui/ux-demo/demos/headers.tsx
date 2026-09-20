import { PanelHeader } from '@kerfjs/ui/panel-header';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { Wrench } from 'lucide';

import { button, icon } from './state.js';

export function HeadersDemo() {
  // One PanelHeader as a page title (no icon), one as a panel/dialog heading
  // (icon + subtitle), each owning its own row — no extra card chrome.
  return <div class="demo-frame" data-demo="headers">
    <PanelHeader title="UI foundations" titleId="headers-page-title" actions={button('New pattern', 'log-add')} />
    <PanelHeader title="Package details" titleId="headers-panel-title" summary="Production-backed primitives with explicit contracts." summaryId="headers-panel-summary" icon={icon(Wrench, 'wrench')} actions={button('Done', 'log-done')} />
    <div class="kui-content"><ValueTable label="Package metadata"><ValueTableRow label="Package" value="@kerfjs/ui" /><ValueTableRow label="Rendering" value="Kerf SafeHtml" /><ValueTableRow label="Styles" value="Explicit CSS subpaths" /></ValueTable></div>
  </div>;
}

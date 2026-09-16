import type { SafeHtml } from 'kerfjs';

import { Toolbar } from './toolbar.js';
import { ToolbarControlGroup } from './toolbar-control-group.js';
import { ToolbarText } from './toolbar-text.js';

export interface PanelHeaderProps {
  title: string;
  titleId: string;
  summary?: string;
  summaryId?: string;
  icon?: SafeHtml;
  iconClassName?: string;
  actions?: SafeHtml;
}

/**
 * The heading of a panel, dialog, or page: a plain `Toolbar` whose leading zone
 * holds an optional icon control group and the title as extra-large `ToolbarText`,
 * whose trailing zone holds the app's action controls, and with an optional
 * subtitle on its own row, left-aligned with the title.
 *
 * PanelHeader overrides no Toolbar styles — it is just a Toolbar with an xl title.
 * The only styling it adds is the icon group's fill/border color and the subtitle.
 * When no icon is provided, the icon group is omitted entirely. The `actions` slot
 * is passed straight into the toolbar's trailing zone; the app supplies whatever
 * trailing controls it needs (typically a `ToolbarControlGroup`).
 */
export function PanelHeader({ title, titleId, summary, summaryId, icon, iconClassName = '', actions }: PanelHeaderProps) {
  const identity = <>
    {icon && <ToolbarControlGroup single className={`kui-panel-header__icon ${iconClassName}`.trim()}>{icon}</ToolbarControlGroup>}
    <ToolbarText text={title} size="xlarge" id={titleId} className="kui-panel-header__title" />
  </>;

  return <div class="kui-panel-header" data-component="panel-header" data-has-icon={String(Boolean(icon))} data-has-actions={String(Boolean(actions))} data-has-summary={String(Boolean(summary))}>
    <Toolbar leading={identity} trailing={actions} divider={false} />
    {summary && <p class="kui-panel-header__summary" id={summaryId}>{summary}</p>}
  </div>;
}

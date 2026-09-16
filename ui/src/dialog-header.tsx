import type { SafeHtml } from 'kerfjs';

import { Toolbar } from './toolbar.js';
import { ToolbarControlGroup } from './toolbar-control-group.js';
import { ToolbarText } from './toolbar-text.js';

export interface DialogHeaderProps {
  title: string;
  titleId: string;
  summary?: string;
  summaryId?: string;
  icon?: SafeHtml;
  iconClassName?: string;
  actions?: SafeHtml;
  actionsLabel?: string;
}

/**
 * The header row of a dialog: a real `Toolbar` whose leading zone holds an
 * optional icon (a borderless control group with an overridden circular
 * background) and the title as large `ToolbarText`, and whose trailing zone holds
 * the action controls. An optional summary sits on its own row, left-aligned with
 * the title. The header owns no inline padding or border of its own — its
 * sub-elements (icon, title, action buttons) carry their own geometry.
 */
export function DialogHeader({ title, titleId, summary, summaryId, icon, iconClassName = '', actions, actionsLabel }: DialogHeaderProps) {
  const identity = <>
    {icon && <ToolbarControlGroup appearance="borderless" single className={`kui-dialog-header__icon ${iconClassName}`.trim()}>{icon}</ToolbarControlGroup>}
    <ToolbarText text={title} size="large" id={titleId} className="kui-dialog-header__title" />
  </>;
  const actionGroup = actions ? <ToolbarControlGroup className="kui-dialog-header__actions" label={actionsLabel}>{actions}</ToolbarControlGroup> : undefined;

  return <div class="kui-dialog-header" data-component="dialog-header" data-has-icon={String(Boolean(icon))} data-has-actions={String(Boolean(actions))} data-has-summary={String(Boolean(summary))}>
    <Toolbar leading={identity} trailing={actionGroup} divider={false} className="kui-dialog-header__toolbar" />
    {summary && <p class="kui-dialog-header__summary" id={summaryId}>{summary}</p>}
  </div>;
}

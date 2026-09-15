import type { SafeHtml } from 'kerfjs';

import { Toolbar } from './toolbar.js';
import { ToolbarControlGroup } from './toolbar-control-group.js';

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

export function DialogHeader({ title, titleId, summary, summaryId, icon, iconClassName = '', actions, actionsLabel }: DialogHeaderProps) {
  const titleContent = <div class="kui-dialog-header__copy"><h2 id={titleId}>{title}</h2></div>;
  const identity = <ToolbarControlGroup
    appearance="borderless"
    className="kui-dialog-header__identity"
    children={icon ? [<span class={`kui-dialog-header__icon ${iconClassName}`.trim()}>{icon}</span>, titleContent] : titleContent}
  />;
  const actionGroup = actions && <ToolbarControlGroup className="kui-dialog-header__actions" label={actionsLabel}>{actions}</ToolbarControlGroup>;

  return <div class="kui-dialog-header" data-component="dialog-header" data-has-icon={String(Boolean(icon))} data-has-actions={String(Boolean(actions))} data-has-summary={String(Boolean(summary))}>
    <Toolbar leading={identity} trailing={actionGroup} divider={false} className="kui-dialog-header__toolbar" />
    {summary && <p class="kui-dialog-header__summary" id={summaryId}>{summary}</p>}
  </div>;
}

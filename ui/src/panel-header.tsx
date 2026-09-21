import type { SafeHtml } from 'kerfjs';

import { Skeleton } from './skeleton.js';
import { Toolbar } from './toolbar.js';
import { ToolbarControlGroup } from './toolbar-control-group.js';
import { type HeadingLevel, ToolbarText } from './toolbar-text.js';

export interface PanelHeaderProps {
  title: string;
  titleId: string;
  summary?: string;
  summaryId?: string;
  icon?: SafeHtml;
  iconClassName?: string;
  actions?: SafeHtml;
  /**
   * Expose the title as a heading landmark (`role="heading"` + `aria-level`). Set it
   * for a PAGE or view heading so screen-reader heading navigation works and the view
   * has a primary heading; omit it (the default) for a dialog title, which is instead
   * referenced via `aria-labelledby={titleId}` and needs no heading landmark.
   */
  headingLevel?: HeadingLevel;
  /** Render the title and summary as unanimated loading skeletons, keeping the icon and actions. */
  placeholder?: boolean;
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
export function PanelHeader({
  title,
  titleId,
  summary,
  summaryId,
  icon,
  iconClassName = '',
  actions,
  headingLevel,
  placeholder = false,
}: PanelHeaderProps) {
  const identity = (
    <>
      {icon && (
        <ToolbarControlGroup
          single
          className={`kui-panel-header__icon ${iconClassName}`.trim()}
        >
          {icon}
        </ToolbarControlGroup>
      )}
      <ToolbarText
        text={title}
        size="xlarge"
        id={titleId}
        className="kui-panel-header__title"
        headingLevel={headingLevel}
        placeholder={placeholder}
      />
    </>
  );

  return (
    <div
      class="kui-panel-header"
      data-component="panel-header"
      data-has-icon={String(Boolean(icon))}
      data-has-actions={String(Boolean(actions))}
      data-has-summary={String(Boolean(summary))}
      data-placeholder={placeholder ? 'true' : undefined}
    >
      <Toolbar leading={identity} trailing={actions} divider={false} />
      {summary && (
        <p class="kui-panel-header__summary" id={summaryId}>
          {placeholder ? <Skeleton width="18em" /> : summary}
        </p>
      )}
    </div>
  );
}

import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/badge.css';
import '@kerfjs/ui/disclosure-arrow.css';
import '@kerfjs/ui/text.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/list-item.css';
import '@kerfjs/ui/list-action-row.css';
import '@kerfjs/ui/list-header.css';
import '@kerfjs/ui/loading-spinner.css';
import '@kerfjs/ui/app-tab.css';
import '@kerfjs/ui/segmented-control.css';
import '@kerfjs/ui/state-banner.css';
import '@kerfjs/ui/value-table.css';
import '@kerfjs/ui/select.css';
import '@kerfjs/ui/skeleton.css';
import '@kerfjs/ui/select/register';
// Web Awesome's native layer dims every `button:disabled`; placeholders must
// look live with it loaded, as in the catalog and most applications.
import '@kerfjs/ui/webawesome.css';

import { AppTab } from '@kerfjs/ui/app-tab';
import { ListActionRow } from '@kerfjs/ui/list-action-row';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select } from '@kerfjs/ui/select';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import type { SafeHtml } from 'kerfjs';
import { Columns3, FileText, Inbox, List, MoreHorizontal, Plus } from 'lucide';

/**
 * Every placeholder-capable component, each rendered by one case function from
 * identical props. The browser test renders the whole set twice — live and as
 * placeholders — and diffs the two renders element by element, so a case must
 * differ between the two only in its `placeholder` flag.
 */
type Case = (placeholder: boolean) => SafeHtml;

const inbox = () => <LucideIcon icon={Inbox} name="inbox" />;
const file = () => <LucideIcon icon={FileText} name="file-text" />;

export const cases: Record<string, Case> = {
  'toolbar-text': (placeholder) => (
    <ToolbarText
      text="Ticket · KF-2048"
      size="xlarge"
      placeholder={placeholder}
    />
  ),
  'value-table-row': (placeholder) => (
    <ValueTable label="Details">
      <ValueTableRow
        label="Status"
        value="In review"
        icon={inbox()}
        placeholder={placeholder}
      />
      <ValueTableRow
        label="Owner"
        value="Mara Lopez"
        placeholder={placeholder}
      />
    </ValueTable>
  ),
  'list-item': (placeholder) => (
    <ListItem action="open" label="Reassign ticket" placeholder={placeholder} />
  ),
  'list-item-icon': (placeholder) => (
    <ListItem
      action="open"
      label="Reassign ticket"
      icon={inbox()}
      placeholder={placeholder}
    />
  ),
  'list-item-description': (placeholder) => (
    <ListItem
      action="open"
      label="Build checks"
      description="Updated a moment ago"
      icon={file()}
      placeholder={placeholder}
    />
  ),
  'list-item-compact-description': (placeholder) => (
    <ListItem
      action="open"
      label="Build checks"
      description="Updated a moment ago"
      density="compact"
      placeholder={placeholder}
    />
  ),
  'list-item-trailing': (placeholder) => (
    <ListItem
      action="open"
      label="Drafts"
      status="Synced"
      trailing={<span>12</span>}
      placeholder={placeholder}
    />
  ),
  // The busy spinner is component-owned chrome from a known prop, so it
  // stays live in a placeholder; only status and trailing values skeleton.
  'list-item-busy': (placeholder) => (
    <ListItem
      action="open"
      label="Syncing folder"
      icon={inbox()}
      busy
      placeholder={placeholder}
    />
  ),
  'list-item-busy-trailing': (placeholder) => (
    <ListItem
      action="open"
      label="Drafts"
      busy
      status="Synced"
      trailing={<span>12</span>}
      placeholder={placeholder}
    />
  ),
  // An author-disabled control is unavailable once loaded, so its
  // placeholder keeps the live disabled tone.
  'list-item-disabled': (placeholder) => (
    <ListItem
      action="open"
      label="Archived project"
      icon={inbox()}
      disabled
      placeholder={placeholder}
    />
  ),
  'list-action-row': (placeholder) => (
    <ListActionRow
      action="open"
      label="src/main.ts"
      trailingAction="more"
      trailingActionLabel="Actions"
      trailingActionIcon={<LucideIcon icon={MoreHorizontal} name="more" />}
      placeholder={placeholder}
    />
  ),
  'list-action-row-full': (placeholder) => (
    <ListActionRow
      action="open"
      label="generated-report.json"
      description="Ready to review"
      status="3 warnings"
      icon={file()}
      trailingAction="more"
      trailingActionLabel="Actions"
      trailingActionIcon={<LucideIcon icon={MoreHorizontal} name="more" />}
      placeholder={placeholder}
    />
  ),
  // The busy spinner is component-owned chrome from a known prop, so it
  // stays live in a placeholder; only the status text becomes a skeleton.
  'list-action-row-busy': (placeholder) => (
    <ListActionRow
      action="open"
      label="Syncing folder"
      icon={file()}
      busy
      trailingAction="more"
      trailingActionLabel="Actions"
      trailingActionIcon={<LucideIcon icon={MoreHorizontal} name="more" />}
      placeholder={placeholder}
    />
  ),
  'list-action-row-busy-status': (placeholder) => (
    <ListActionRow
      action="open"
      label="generated-report.json"
      status="Uploading"
      icon={file()}
      busy
      trailingAction="more"
      trailingActionLabel="Actions"
      trailingActionIcon={<LucideIcon icon={MoreHorizontal} name="more" />}
      placeholder={placeholder}
    />
  ),
  'list-action-row-interaction': (placeholder) => (
    <ListActionRow
      action="open"
      label="src/main.ts"
      description="Modified"
      trailingAction="more"
      trailingActionLabel="Actions"
      trailingActionIcon={<LucideIcon icon={MoreHorizontal} name="more" />}
      trailingActionVisibility="interaction"
      placeholder={placeholder}
    />
  ),
  'list-action-row-disabled': (placeholder) => (
    <ListActionRow
      action="open"
      label="locked.ts"
      description="Read only"
      trailingAction="more"
      trailingActionLabel="Actions"
      trailingActionIcon={<LucideIcon icon={MoreHorizontal} name="more" />}
      disabled
      trailingActionDisabled
      placeholder={placeholder}
    />
  ),
  'list-action-row-trailing-disabled': (placeholder) => (
    <ListActionRow
      action="open"
      label="src/main.ts"
      trailingAction="more"
      trailingActionLabel="Actions"
      trailingActionIcon={<LucideIcon icon={MoreHorizontal} name="more" />}
      trailingActionDisabled
      placeholder={placeholder}
    />
  ),
  'segmented-control-icons': (placeholder) => (
    <SegmentedControl
      id="view"
      label="View"
      value="details"
      appearance="toolbar"
      shape="pill"
      size="small"
      placeholder={placeholder}
      choices={[
        {
          value: 'details',
          label: 'Details',
          content: <LucideIcon icon={List} name="list" />,
        },
        {
          value: 'activity',
          label: 'Activity',
          content: <LucideIcon icon={Columns3} name="columns-3" />,
        },
        { value: 'files', label: 'Files', content: file() },
      ]}
    />
  ),
  'segmented-control-text': (placeholder) => (
    <SegmentedControl
      id="density"
      label="Density"
      value="comfortable"
      shape="pill"
      placeholder={placeholder}
      choices={[
        { value: 'compact', label: 'Compact' },
        { value: 'comfortable', label: 'Comfortable' },
        { value: 'roomy', label: 'Roomy' },
      ]}
    />
  ),
  'segmented-control-choice-disabled': (placeholder) => (
    <SegmentedControl
      id="sort"
      label="Sort"
      value="name"
      shape="pill"
      placeholder={placeholder}
      choices={[
        { value: 'name', label: 'Name' },
        { value: 'date', label: 'Date' },
        { value: 'size', label: 'Size', disabled: true },
      ]}
    />
  ),
  'list-header-action': (placeholder) => (
    <ListHeader
      label="Attachments"
      count={12}
      countLabel="12 attachments"
      action="add"
      actionLabel="Add attachment"
      actionIcon={<LucideIcon icon={Plus} name="plus" />}
      placeholder={placeholder}
    />
  ),
  'list-header-toggle': (placeholder) => (
    <ListHeader
      label="Recent"
      count={4}
      countLabel="4 recent"
      action="toggle-recent"
      toggle
      expanded
      placeholder={placeholder}
    />
  ),
  'list-header-action-disabled': (placeholder) => (
    <ListHeader
      label="Attachments"
      action="add"
      actionLabel="Add file"
      actionIcon={<LucideIcon icon={Plus} name="plus" />}
      actionDisabled
      disabledReason="Read only"
      placeholder={placeholder}
    />
  ),
  'list-header-toggle-disabled': (placeholder) => (
    <ListHeader
      label="Archived"
      action="toggle-archived"
      toggle
      expanded={false}
      actionDisabled
      placeholder={placeholder}
    />
  ),
  'app-tab': (placeholder) => (
    <div role="tablist" aria-label="Tabs">
      <AppTab id="notes" name="Notes" placeholder={placeholder} />
    </div>
  ),
  'app-tab-segmented': (placeholder) => (
    <div role="tablist" aria-label="Tabs">
      <AppTab
        id="notes"
        name="Notes"
        presentation="segmented"
        size="compact"
        placeholder={placeholder}
      />
    </div>
  ),
  'state-banner': (placeholder) => (
    <StateBanner
      tone="success"
      title="Up to date"
      detail="All checks passed on the latest revision."
      icon={file()}
      placeholder={placeholder}
    />
  ),
  'state-banner-no-detail': (placeholder) => (
    <StateBanner
      tone="warning"
      title="Sync paused"
      badge="3"
      icon={file()}
      placeholder={placeholder}
    />
  ),
  select: (placeholder) => (
    <Select
      name="status"
      value="review"
      label="Status"
      hint="Where this ticket sits in the review workflow."
      placeholder={placeholder}
      choices={[
        { value: 'review', label: 'In review' },
        { value: 'done', label: 'Done' },
      ]}
    />
  ),
};

function render(placeholder: boolean) {
  return (
    <section data-state={placeholder ? 'placeholder' : 'live'}>
      {Object.entries(cases).map(([name, render]) => (
        <div data-case={name}>{render(placeholder)}</div>
      ))}
    </section>
  );
}

const host = document.querySelector('[data-placeholder-cases]')!;
host.innerHTML = `${String(render(false))}${String(render(true))}`;

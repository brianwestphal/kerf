import { Columns3, List, Settings } from 'lucide';
import { describe, expect, it } from 'vitest';

import { AppTab } from '../../src/app-tab.js';
import { ListActionRow } from '../../src/list-action-row.js';
import { ListHeader } from '../../src/list-header.js';
import { ListItem } from '../../src/list-item.js';
import { LucideIcon } from '../../src/lucide-icon.js';
import { SegmentedControl } from '../../src/segmented-control.js';
import { Select } from '../../src/select.js';
import { Skeleton } from '../../src/skeleton.js';
import { StateBanner } from '../../src/state-banner.js';
import { ToolbarText } from '../../src/toolbar-text.js';
import { ValueTableRow } from '../../src/value-table-row.js';

const asHtml = (value: unknown) => String(value);
const icon = <LucideIcon icon={Settings} name="settings" />;

describe('Skeleton primitive', () => {
  it('renders a decorative, unanimated block by default', () => {
    const html = asHtml(Skeleton({}));
    expect(html).toContain('class="kui-skeleton"');
    expect(html).toContain('data-component="skeleton"');
    expect(html).toContain('aria-hidden="true"');
    // Deliberately no animation styling hook.
    expect(html).not.toContain('animation');
  });

  it('applies width, height, and radius as inline style', () => {
    const html = asHtml(
      Skeleton({ width: 'remify(120px)', height: '1.5em', radius: '2px' }),
    );
    expect(html).toContain('width:remify(120px)');
    expect(html).toContain('height:1.5em');
    expect(html).toContain('--kui-skeleton-radius:2px');
  });

  it('renders stacked lines with a shorter last line', () => {
    const html = asHtml(Skeleton({ lines: 3 }));
    expect(html).toContain('class="kui-skeleton-lines"');
    expect(html.match(/class="kui-skeleton"/g)).toHaveLength(3);
    expect(html).toContain('width:60%');
  });

  it('announces itself when labeled', () => {
    const html = asHtml(Skeleton({ label: 'Loading value' }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Loading value"');
    expect(html).not.toContain('aria-hidden');
  });

  it('sizes stacked lines with an explicit width and height', () => {
    const html = asHtml(Skeleton({ lines: 2, width: '50%', height: '0.9em' }));
    expect(html).toContain('class="kui-skeleton-lines"');
    expect(html).toContain('width:50%');
    expect(html).toContain('height:0.9em');
  });
});

describe('component placeholder mode', () => {
  it('ToolbarText replaces its text with a skeleton', () => {
    const html = asHtml(
      ToolbarText({ text: 'Ticket title', size: 'xlarge', placeholder: true }),
    );
    expect(html).toContain('data-placeholder="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('kui-skeleton');
    expect(html).not.toContain('Ticket title');
    // size chrome preserved so it stays the right height.
    expect(html).toContain('data-size="xlarge"');
  });

  it('ValueTableRow keeps the field label and skeletons the value', () => {
    const html = asHtml(
      ValueTableRow({ label: 'Owner', value: 'Jordan', placeholder: true }),
    );
    expect(html).toContain('data-placeholder="true"');
    expect(html).toContain('Owner');
    expect(html).toContain('kui-skeleton');
    expect(html).not.toContain('Jordan');
  });

  it('ListItem disables the button, drops its action, and skeletons label + icon', () => {
    const html = asHtml(
      ListItem({
        label: 'Inbox',
        icon,
        action: 'open-inbox',
        itemId: 'inbox',
        placeholder: true,
      }),
    );
    expect(html).toContain('data-placeholder="true"');
    expect(html).toContain('disabled');
    expect(html).not.toContain('data-action="open-inbox"');
    expect(html).not.toContain('>Inbox<');
    expect(
      html.match(/class="kui-skeleton"/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
  });

  it('ListItem skeletons a trailing slot when present', () => {
    const html = asHtml(
      ListItem({
        label: 'Drafts',
        action: 'open',
        trailing: <span>12</span>,
        placeholder: true,
      }),
    );
    expect(html).toContain('kui-list-item__trailing');
    expect(html).not.toContain('>12<');
    expect(html).toContain('kui-skeleton');
  });

  it('ListActionRow disables both buttons and drops their actions', () => {
    const html = asHtml(
      ListActionRow({
        label: 'Task',
        action: 'open',
        itemId: 'task',
        trailingAction: 'more',
        trailingActionLabel: 'More',
        trailingActionIcon: icon,
        placeholder: true,
      }),
    );
    expect(html).toContain('data-placeholder="true"');
    expect(html).not.toContain('data-action="open"');
    expect(html).not.toContain('data-action="more"');
    expect(html).toContain('kui-skeleton');
  });

  it('ListHeader keeps the label and action affordance but disables interaction', () => {
    const html = asHtml(
      ListHeader({
        label: 'Projects',
        action: 'add',
        actionLabel: 'Add',
        actionIcon: icon,
        count: 4,
        countLabel: '4 projects',
        placeholder: true,
      }),
    );
    expect(html).toContain('data-placeholder="true"');
    expect(html).toContain('Projects');
    expect(html).not.toContain('data-action="add"');
    expect(html).toContain(' disabled');
    // The count value is unknown while loading: a skeleton, not the number.
    expect(html).toContain('kui-skeleton');
    expect(html).not.toContain('>4<');
  });

  it('ListHeader toggle placeholder keeps the label and disables the toggle', () => {
    const html = asHtml(
      ListHeader({
        label: 'Metadata',
        toggle: true,
        action: 'toggle-meta',
        expanded: true,
        placeholder: true,
      }),
    );
    expect(html).toContain('data-toggle="true"');
    expect(html).toContain('data-placeholder="true"');
    expect(html).toContain('Metadata');
    expect(html).not.toContain('data-action="toggle-meta"');
    expect(html).toContain('disabled');
  });

  it('ListHeader placeholder without a count or badge shows no indicator skeleton', () => {
    const html = asHtml(ListHeader({ label: 'Details', placeholder: true }));
    expect(html).toContain('data-placeholder="true"');
    expect(html).toContain('Details');
    expect(html).not.toContain('kui-skeleton');
  });

  it('AppTab skeletons the name, disables its buttons, and is not draggable', () => {
    const html = asHtml(
      AppTab({
        id: 't1',
        name: 'Overview',
        draggable: true,
        selectAction: 'pick',
        placeholder: true,
      }),
    );
    expect(html).toContain('data-placeholder="true"');
    expect(html).toContain('draggable="false"');
    expect(html).not.toContain('data-action="pick"');
    expect(html).toContain('kui-skeleton');
    expect(html).not.toContain('>Overview<');
  });

  it('SegmentedControl disables every segment and skeletons their content', () => {
    const html = asHtml(
      SegmentedControl({
        id: 'view',
        label: 'View',
        value: 'list',
        action: 'select-view',
        choices: [
          {
            value: 'list',
            label: 'List',
            content: <LucideIcon icon={List} name="list" />,
          },
          {
            value: 'columns',
            label: 'Columns',
            content: <LucideIcon icon={Columns3} name="columns-3" />,
          },
        ],
        placeholder: true,
      }),
    );
    expect(html).toContain('data-placeholder="true"');
    expect(html).not.toContain('data-action="select-view"');
    expect(html.match(/class="kui-skeleton"/g)).toHaveLength(2);
    expect(html).toContain('disabled');
  });

  it('StateBanner skeletons the title and detail, keeping the icon', () => {
    const html = asHtml(
      StateBanner({
        title: 'Syncing',
        detail: 'Fetching the latest',
        badge: '4',
        icon,
        placeholder: true,
      }),
    );
    expect(html).toContain('data-placeholder="true"');
    expect(html).toContain('kui-state-banner__icon');
    expect(html.match(/class="kui-skeleton"/g)).toHaveLength(3);
    expect(html).not.toContain('Fetching the latest');
    expect(html).not.toContain('>4</span>');
  });

  it('Select renders a static control box instead of the interactive wa-select', () => {
    const html = asHtml(
      Select({
        name: 'status',
        value: 'open',
        label: 'Status',
        hint: 'Current workflow state.',
        choices: [{ value: 'open', label: 'Open' }],
        placeholder: true,
      }),
    );
    expect(html).toContain('kui-select--placeholder');
    expect(html).toContain('data-placeholder="true"');
    expect(html).toContain('Status');
    expect(html).toContain('kui-skeleton');
    expect(html).toContain('kui-select__placeholder-chevron');
    expect(html).toContain(
      '<span class="kui-select__placeholder-hint">Current workflow state.</span>',
    );
    expect(html).not.toContain('<wa-select');
  });

  it('Select placeholder omits the label element when no label is given', () => {
    const html = asHtml(
      Select({
        name: 'status',
        value: 'open',
        ariaLabel: 'Status',
        choices: [{ value: 'open', label: 'Open' }],
        placeholder: true,
      }),
    );
    expect(html).toContain('kui-select--placeholder');
    expect(html).not.toContain('kui-select__placeholder-label');
    expect(html).toContain('kui-skeleton');
  });

  it('Select still emits its placeholder hint text when not loading', () => {
    const html = asHtml(
      Select<string>({
        name: 'status',
        value: '',
        ariaLabel: 'Status',
        placeholderText: 'Choose a status',
        choices: [{ value: 'open', label: 'Open' }],
      }),
    );
    expect(html).toContain('<wa-select');
    expect(html).toContain('placeholder="Choose a status"');
  });
});

import { raw } from 'kerfjs';
import { Columns3, List, Settings } from 'lucide';
import { describe, expect, it } from 'vitest';

import { AppTab } from '../../src/app-tab.js';
import { em, pct, px, rem } from '../../src/css-values.js';
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
      Skeleton({ width: rem(7.5), height: em(1.5), radius: px(2) }),
    );
    expect(html).toContain('width:7.5rem');
    expect(html).toContain('height:1.5em');
    expect(html).toContain('--kui-skeleton-radius:2px');
  });

  it('renders stacked lines with a shorter last line', () => {
    const html = asHtml(Skeleton({ lines: 3 }));
    expect(html).toContain('class="kui-skeleton-lines"');
    expect(html.match(/class="kui-skeleton"/g)).toHaveLength(3);
    expect(html).toContain('width:60%');
  });

  it('lays out as a block only when asked', () => {
    expect(String(Skeleton({}))).not.toContain('data-block');
    expect(String(Skeleton({ block: true }))).toContain('data-block="true"');
  });

  it('announces itself when labeled', () => {
    const html = asHtml(Skeleton({ label: 'Loading value' }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Loading value"');
    expect(html).not.toContain('aria-hidden');
  });

  it('sizes stacked lines with an explicit width and height', () => {
    const html = asHtml(
      Skeleton({ lines: 2, width: pct(50), height: em(0.9) }),
    );
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
    // The icon placeholder is a block, so it centers in the icon slot.
    expect(html).toMatch(
      /class="kui-list-item__icon"><span[^>]*class="kui-skeleton"[^>]*data-block="true"/,
    );
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

  it('ListItem keeps a description line as a second skeleton, only when set', () => {
    const withDescription = asHtml(
      ListItem({
        label: 'Inbox',
        description: 'Unread mail',
        action: 'open',
        placeholder: true,
      }),
    );
    expect(withDescription).toContain('data-has-description="true"');
    expect(withDescription).toMatch(
      /class="kui-list-item__description"><span[^>]*class="kui-skeleton"/,
    );
    expect(withDescription).not.toContain('Unread mail');
    const without = asHtml(
      ListItem({ label: 'Inbox', action: 'open', placeholder: true }),
    );
    expect(without).not.toContain('kui-list-item__description');
  });

  it('ListActionRow keeps description and status lines as skeletons with a block icon', () => {
    const html = asHtml(
      ListActionRow({
        label: 'Task',
        description: 'Due tomorrow',
        status: 'Synced',
        icon,
        action: 'open',
        trailingAction: 'more',
        trailingActionLabel: 'More',
        trailingActionIcon: icon,
        placeholder: true,
      }),
    );
    expect(html).toMatch(
      /class="kui-list-action-row__description"><span[^>]*class="kui-skeleton"/,
    );
    expect(html).toMatch(
      /class="kui-list-action-row__status"><span[^>]*class="kui-skeleton"/,
    );
    expect(html).toMatch(
      /class="kui-list-action-row__icon"><span[^>]*class="kui-skeleton"[^>]*data-block="true"/,
    );
    expect(html).not.toContain('Due tomorrow');
    expect(html).not.toContain('Synced');
    const bare = asHtml(
      ListActionRow({
        label: 'Task',
        action: 'open',
        trailingAction: 'more',
        trailingActionLabel: 'More',
        trailingActionIcon: icon,
        placeholder: true,
      }),
    );
    expect(bare).not.toContain('kui-list-action-row__description');
    expect(bare).not.toContain('kui-list-action-row__status');
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

  it('AppTab pending keeps its name but is dormant, busy, and named by it', () => {
    const html = asHtml(
      AppTab({
        id: 'alpha',
        name: 'alpha',
        draggable: true,
        selected: true,
        selectAction: 'pick',
        closeAction: 'drop',
        trailing: raw('<span class="spinner" aria-label="Opening"></span>'),
        pending: true,
      }),
    );
    expect(html).toContain('data-pending="true"');
    expect(html).not.toContain('data-placeholder');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('draggable="false"');
    expect(html).not.toContain('data-action="pick"');
    expect(html).not.toContain('data-action="drop"');
    expect(html).not.toContain('aria-keyshortcuts');
    expect(html).not.toContain('kui-skeleton');
    // The visible label stays, and names the tab so a spinner label is not
    // folded into its accessible name.
    expect(html).toContain('>alpha</span>');
    expect(html).toMatch(/role="tab"[^>]*aria-label="alpha"/);
    expect(html).toMatch(/role="tab"[^>]*disabled[^>]*tabindex="-1"/);
    expect(html).toContain('class="spinner"');
  });

  it('AppTab placeholder wins over pending', () => {
    const html = asHtml(
      AppTab({ id: 'a', name: 'alpha', placeholder: true, pending: true }),
    );
    expect(html).toContain('data-placeholder="true"');
    expect(html).not.toContain('data-pending');
    expect(html).toContain('kui-skeleton');
    expect(html).not.toMatch(/role="tab"[^>]*aria-label=/);
  });

  it('SegmentedControl disables every segment, keeps its choices, and selects none', () => {
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
    // The choices are known chrome; only the selection is unknown.
    expect(html).not.toContain('kui-skeleton');
    expect(html).toContain('data-lucide="list"');
    expect(html).toContain('data-lucide="columns-3"');
    expect(html).not.toContain('data-selected="true"');
    expect(html).not.toContain('aria-pressed="true"');
    expect(html.match(/ disabled/g)).toHaveLength(2);
  });

  it('SegmentedControl placeholder keeps text choices as their live labels', () => {
    const html = asHtml(
      SegmentedControl({
        id: 'range',
        label: 'Range',
        value: 'day',
        choices: [
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
        ],
        placeholder: true,
      }),
    );
    expect(html).toContain('<span>Day</span>');
    expect(html).toContain('<span>Week</span>');
    expect(html).not.toContain('data-selected="true"');
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

  it('StateBanner adds a detail skeleton only when the live banner has a detail', () => {
    const html = asHtml(
      StateBanner({ title: 'Syncing', icon, placeholder: true }),
    );
    expect(html).not.toContain('kui-state-banner__detail');
    expect(html.match(/class="kui-skeleton"/g)).toHaveLength(1);
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

describe('author-disabled marker', () => {
  const marker = 'data-kui-disabled="true"';
  const count = (html: string) => html.split(marker).length - 1;

  it('marks exactly the controls whose disabled prop is set, live or placeholder', () => {
    for (const placeholder of [false, true]) {
      expect(
        count(
          asHtml(
            ListItem({
              label: 'A',
              action: 'open',
              disabled: true,
              placeholder,
            }),
          ),
        ),
      ).toBe(1);
      expect(
        count(asHtml(ListItem({ label: 'A', action: 'open', placeholder }))),
      ).toBe(0);
      const row = (props: {
        disabled?: boolean;
        trailingActionDisabled?: boolean;
      }) =>
        asHtml(
          ListActionRow({
            label: 'Task',
            action: 'open',
            trailingAction: 'more',
            trailingActionLabel: 'More',
            trailingActionIcon: icon,
            placeholder,
            ...props,
          }),
        );
      expect(count(row({}))).toBe(0);
      expect(row({ disabled: true })).toMatch(
        /class="kui-list-action-row__primary"[^>]*data-kui-disabled="true"/,
      );
      expect(count(row({ disabled: true }))).toBe(1);
      expect(row({ trailingActionDisabled: true })).toMatch(
        /class="kui-list-action-row__trailing-action"[^>]*data-kui-disabled="true"/,
      );
      expect(count(row({ trailingActionDisabled: true }))).toBe(1);
      expect(count(row({ disabled: true, trailingActionDisabled: true }))).toBe(
        2,
      );
      const segmented = asHtml(
        SegmentedControl({
          id: 'sort',
          label: 'Sort',
          value: 'name',
          choices: [
            { value: 'name', label: 'Name' },
            { value: 'size', label: 'Size', disabled: true },
          ],
          placeholder,
        }),
      );
      expect(count(segmented)).toBe(1);
      expect(segmented).toMatch(
        /data-segment-value="size"[^>]*data-kui-disabled="true"/,
      );
      const header = (actionDisabled: boolean, toggle: boolean) =>
        asHtml(
          toggle
            ? ListHeader({
                label: 'Files',
                toggle: true,
                action: 'toggle',
                expanded: false,
                actionDisabled,
                placeholder,
              })
            : ListHeader({
                label: 'Files',
                action: 'add',
                actionLabel: 'Add',
                actionIcon: icon,
                actionDisabled,
                placeholder,
              }),
        );
      expect(count(header(true, false))).toBe(1);
      expect(count(header(true, true))).toBe(1);
      expect(count(header(false, false))).toBe(0);
      expect(count(header(false, true))).toBe(0);
    }
  });

  it('keeps the marker component-owned against extension attributes', () => {
    const widened = { 'data-kui-disabled': 'true' } as Record<string, string>;
    expect(
      count(
        asHtml(
          ListItem({ label: 'A', action: 'open', rootAttributes: widened }),
        ),
      ),
    ).toBe(0);
    expect(
      count(
        asHtml(
          ListActionRow({
            label: 'Task',
            action: 'open',
            trailingAction: 'more',
            trailingActionLabel: 'More',
            trailingActionIcon: icon,
            trailingActionAttributes: widened,
          }),
        ),
      ),
    ).toBe(0);
    expect(
      count(
        asHtml(
          ListHeader({
            label: 'Files',
            action: 'add',
            actionLabel: 'Add',
            actionIcon: icon,
            triggerAttributes: widened,
          }),
        ),
      ),
    ).toBe(0);
    ListItem({
      label: 'A',
      action: 'open',
      // @ts-expect-error The disabled marker is owned by ListItem.disabled.
      rootAttributes: { 'data-kui-disabled': 'true' },
    });
    ListActionRow({
      label: 'Task',
      action: 'open',
      trailingAction: 'more',
      trailingActionLabel: 'More',
      trailingActionIcon: icon,
      // @ts-expect-error The disabled marker is owned by trailingActionDisabled.
      trailingActionAttributes: { 'data-kui-disabled': 'true' },
    });
    ListHeader({
      label: 'Files',
      action: 'add',
      actionLabel: 'Add',
      actionIcon: icon,
      // @ts-expect-error The disabled marker is owned by ListHeader.actionDisabled.
      triggerAttributes: { 'data-kui-disabled': 'true' },
    });
  });
});

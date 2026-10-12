import { FolderOpen } from 'lucide';
import { describe, expect, it } from 'vitest';

import { IconButton } from '../../src/components/actions/icon-button/icon-button.js';

describe('IconButton', () => {
  it('renders a wa-button whose lone LucideIcon carries the accessible name', () => {
    const html = String(
      IconButton({
        icon: FolderOpen,
        iconName: 'folder-open',
        label: 'Browse',
        action: 'browse',
      }),
    );
    expect(html).toMatch(
      /^<wa-button class="kui-icon-button" data-component="icon-button" data-action="browse" type="button">/,
    );
    expect(html).toContain('role="img" aria-label="Browse"');
    expect(html).not.toContain('aria-hidden');
    expect(html).not.toContain('disabled');
  });

  it('forwards Web Awesome options and safe metadata', () => {
    const html = String(
      IconButton({
        icon: FolderOpen,
        iconName: 'folder-open',
        label: 'Delete',
        appearance: 'outlined',
        variant: 'danger',
        size: 's',
        type: 'submit',
        disabled: true,
        id: 'delete',
        className: 'row-action',
        slot: 'end',
        rootAttributes: {
          'data-row': '3',
          'data-component': 'other',
        } as unknown as Record<`data-${string}`, string>,
      }),
    );
    expect(html).toContain('data-row="3"');
    expect(html).toContain('id="delete" class="kui-icon-button row-action"');
    expect(html).toContain('data-component="icon-button"');
    expect(html).not.toContain('data-component="other"');
    expect(html).toContain(
      'appearance="outlined" variant="danger" size="s" type="submit" disabled slot="end"',
    );
  });
});

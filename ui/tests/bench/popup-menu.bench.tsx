/**
 * PopupMenu render cost for a large list (KF-GVCMC7): 300 rows, each with an
 * icon trigger and a nine-entry menu whose entries carry Lucide icons and a
 * row id. Run with `npm run bench:micro`. Informational only; not a gate.
 */
import {
  Archive,
  Copy,
  Ellipsis,
  Flag,
  Pencil,
  Share,
  Star,
  Tag,
  Trash,
} from 'lucide';
import { bench, describe } from 'vitest';

import {
  PopupMenu,
  type PopupMenuEntry,
} from '../../src/components/actions/popup-menu/popup-menu.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';
import { LegacyPopupMenu } from '../fixtures/popup-menu-legacy.js';

const ROWS = 300;
const glyphs = [Copy, Pencil, Share, Star, Tag, Flag, Archive] as const;

function rowItems(row: number): PopupMenuEntry[] {
  const attributes = { 'data-row': String(row) };
  return [
    ...glyphs.map((glyph, index) => ({
      label: `Command ${index}`,
      action: `command-${index}`,
      icon: LucideIcon({ icon: glyph, name: `glyph-${index}` }),
      attributes,
    })),
    { kind: 'divider' as const },
    {
      label: 'Delete',
      action: 'delete',
      tone: 'danger' as const,
      icon: LucideIcon({ icon: Trash, name: 'trash' }),
      attributes,
    },
  ];
}

function renderRows(menu = PopupMenu): number {
  let length = 0;
  for (let row = 0; row < ROWS; row++) {
    length += String(
      menu({
        label: 'Row actions',
        icon: LucideIcon({ icon: Ellipsis, name: 'ellipsis' }),
        caret: false,
        items: rowItems(row),
      }),
    ).length;
  }
  return length;
}

const trigger = LucideIcon({ icon: Ellipsis, name: 'ellipsis' });
const prebuilt = Array.from({ length: ROWS }, (_, row) => rowItems(row));

function renderPrebuiltRows(menu = PopupMenu): number {
  let length = 0;
  for (const items of prebuilt) {
    length += String(
      menu({ label: 'Row actions', icon: trigger, caret: false, items }),
    ).length;
  }
  return length;
}

describe('PopupMenu: 300 rows x 9 entries with Lucide icons', () => {
  bench('re-render every row (unchanged props, icons rebuilt)', () => {
    renderRows();
  });

  bench('re-render every row (PopupMenu only, icons prebuilt)', () => {
    renderPrebuiltRows();
  });

  // The implementation before the streaming hash and markup cache.
  bench(
    'previous: re-render every row (unchanged props, icons rebuilt)',
    () => {
      renderRows(LegacyPopupMenu);
    },
  );

  bench(
    'previous: re-render every row (PopupMenu only, icons prebuilt)',
    () => {
      renderPrebuiltRows(LegacyPopupMenu);
    },
  );
});

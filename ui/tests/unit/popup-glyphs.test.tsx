import { describe, expect, it } from 'vitest';

import {
  PopupCaretGlyph,
  PopupSubmenuGlyph,
} from '../../src/shared/popup/popup-glyphs.js';

describe('popup glyphs', () => {
  it('draw decorative stroke chevrons in a square box', () => {
    for (const glyph of [PopupCaretGlyph(), PopupSubmenuGlyph()]) {
      const html = String(glyph);
      expect(html).toContain('viewBox="0 0 14 14"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('stroke="currentColor"');
      expect(html).toContain('fill="none"');
    }
    expect(String(PopupCaretGlyph())).toContain('d="M2 4.75 7 9.75 12 4.75"');
    expect(String(PopupSubmenuGlyph())).toContain('d="M4.75 2 9.75 7 4.75 12"');
  });
});

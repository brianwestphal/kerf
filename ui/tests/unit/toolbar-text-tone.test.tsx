import { describe, expect, it } from 'vitest';

import { ToolbarText } from '../../src/toolbar-text.js';

describe('ToolbarText tone', () => {
  it('keeps the default and forwards dark tone for read-only and actionable titles', () => {
    expect(String(ToolbarText({ text: 'Default' }))).not.toContain('data-tone');
    for (const size of [
      'xlarge',
      'xlarge-fixed',
      'large',
      'default',
      'small',
      'xsmall',
    ] as const) {
      const heading = String(
        ToolbarText({ text: 'Report', tone: 'dark', size, headingLevel: 2 }),
      );
      expect(heading).toContain('data-tone="dark"');
      expect(heading).toContain('aria-level="2"');
      const action = String(
        ToolbarText({ text: 'Rename', tone: 'dark', size, action: 'rename' }),
      );
      expect(action).toContain('<button');
      expect(action).toContain('data-tone="dark"');
      expect(action).toContain('data-action="rename"');
    }
  });
});

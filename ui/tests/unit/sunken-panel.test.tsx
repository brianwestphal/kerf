import { describe, expect, it } from 'vitest';

import { SunkenPanel } from '../../src/sunken-panel.js';

describe('SunkenPanel', () => {
  it('renders an unnamed vertical application surface by default', () => {
    const html = String(
      SunkenPanel({
        className: 'workspace',
        children: [<strong>Activity</strong>, <span>Ready</span>],
      }),
    );

    expect(html).toContain(
      'class="kui-sunken-panel workspace" data-component="sunken-panel"',
    );
    expect(html).not.toContain('role=');
    expect(html).not.toContain('aria-label=');
    expect(html).toContain('<strong>Activity</strong><span>Ready</span>');
  });

  it('becomes a named region only when the application supplies a label', () => {
    expect(
      String(
        SunkenPanel({
          ariaLabel: 'Release workspace',
          children: <span>Ready</span>,
        }),
      ),
    ).toContain('role="region" aria-label="Release workspace"');
  });
});

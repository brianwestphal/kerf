import { describe, expect, it } from 'vitest';

import { EdgeActivityIndicator } from '../../src/components/feedback/edge-activity-indicator/edge-activity-indicator.js';

describe('EdgeActivityIndicator', () => {
  it('renders an idle, decorative strip without a pill by default', () => {
    expect(String(EdgeActivityIndicator({ busy: false }))).toBe(
      '<div class="kui-edge-activity-indicator" data-component="edge-activity-indicator" data-tone="info" data-busy="false" data-inset="safe-area"><div class="kui-edge-activity-indicator__strip" aria-hidden="true"></div></div>',
    );
  });

  it('holds pill text only while busy, so the live region announces it then', () => {
    const busy = String(
      EdgeActivityIndicator({
        busy: true,
        message: 'Syncing',
        tone: 'warning',
        inset: 'none',
        className: 'app',
      }),
    );
    expect(busy).toContain(
      'class="kui-edge-activity-indicator app" data-component="edge-activity-indicator" data-tone="warning" data-busy="true" data-inset="none"',
    );
    expect(busy).toContain(
      'role="status" aria-live="polite" data-visible="true">Syncing</div>',
    );
    for (const props of [
      { busy: false, message: 'Syncing' },
      { busy: true, message: '   ' },
    ])
      expect(String(EdgeActivityIndicator(props))).toContain(
        'data-visible="false"></div>',
      );
  });
});

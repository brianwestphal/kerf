import { MessageSquare } from 'lucide';
import { describe, expect, it } from 'vitest';

import { IconToggleButton } from '../../src/components/actions/icon-toggle-button/icon-toggle-button.js';

describe('IconToggleButton', () => {
  it('renders a native named toggle with an unpressed state and a decorative face', () => {
    const html = String(
      IconToggleButton({
        icon: MessageSquare,
        iconName: 'message-square',
        label: 'Open conversation',
        pressed: false,
        action: 'toggle-conversation',
      }),
    );
    expect(html).toMatch(
      /^<button type="button" class="kui-icon-toggle-button" data-component="icon-toggle-button" data-action="toggle-conversation" data-shape="pill" aria-label="Open conversation" aria-pressed="false"><span class="kui-icon-toggle-button__face" aria-hidden="true"><svg /,
    );
    expect(html).not.toContain('disabled');
  });

  it('reflects pressed, shape, disabled, and safe metadata', () => {
    const html = String(
      IconToggleButton({
        icon: MessageSquare,
        iconName: 'message-square',
        label: 'Open conversation',
        pressed: true,
        shape: 'rounded',
        disabled: true,
        id: 'conversation',
        className: 'footer-toggle',
        slot: 'end',
        rootAttributes: {
          'data-panel': 'conversation',
          'data-shape': 'pill',
        } as unknown as Record<`data-${string}`, string>,
      }),
    );
    expect(html).toContain('data-panel="conversation"');
    expect(html).toContain(
      'id="conversation" class="kui-icon-toggle-button footer-toggle"',
    );
    expect(html).toContain(
      'data-shape="rounded" aria-label="Open conversation" aria-pressed="true" disabled slot="end"',
    );
  });
});

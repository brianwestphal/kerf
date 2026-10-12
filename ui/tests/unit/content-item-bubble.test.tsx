import { describe, expect, it } from 'vitest';

import { ContentItem } from '../../src/content-item.js';

describe('ContentItem bubble', () => {
  it('renders the bubble side and the brand-loud appearance', () => {
    const user = String(
      ContentItem({
        bubble: 'end',
        appearance: 'brand-loud',
        children: <span>Hi</span>,
      }),
    );
    expect(user).toContain('data-appearance="brand-loud"');
    expect(user).toContain('data-bubble="end"');
    expect(
      String(ContentItem({ bubble: 'start', children: <span>Reply</span> })),
    ).toContain('data-bubble="start"');
    expect(String(ContentItem({ children: <span>Plain</span> }))).not.toContain(
      'data-bubble',
    );
  });

  it('protects data-bubble from root attributes', () => {
    const output = String(
      ContentItem({
        bubble: 'start',
        rootAttributes: { 'data-bubble': 'end', 'data-message': 'm1' } as never,
        children: <span>Reply</span>,
      }),
    );
    expect(output).toContain('data-bubble="start"');
    expect(output).not.toContain('data-bubble="end"');
    expect(output).toContain('data-message="m1"');
    const interactive = String(
      ContentItem({
        interactive: true,
        action: 'open-message',
        bubble: 'end',
        rootAttributes: { 'data-bubble': 'start' } as never,
        children: <span>Open</span>,
      }),
    );
    expect(interactive).toContain('data-bubble="end"');
    expect(interactive).not.toContain('data-bubble="start"');
  });
});

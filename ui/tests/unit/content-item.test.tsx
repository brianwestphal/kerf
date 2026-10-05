import { describe, expect, it } from 'vitest';

import { ContentItem } from '../../src/components/surfaces/content-item/content-item.js';

describe('ContentItem', () => {
  it('renders an unframed rounded content item by default', () => {
    const html = String(
      ContentItem({ className: 'details', children: <span>Ready</span> }),
    );

    expect(html).toContain(
      'class="kui-content-item details" data-component="content-item" data-appearance="transparent"',
    );
    expect(html).not.toContain('kui-content-item--framed');
    expect(html).not.toContain('kui-content-item--pill');
    expect(html).not.toContain('role=');
    expect(html).toContain('<span>Ready</span>');
  });

  it('maps the typed frame and shape props onto the public modifiers', () => {
    expect(String(ContentItem({ frame: 'framed' }))).toContain(
      'class="kui-content-item kui-content-item--framed"',
    );
    expect(String(ContentItem({ shape: 'pill' }))).toContain(
      'class="kui-content-item kui-content-item--pill"',
    );
    expect(
      String(ContentItem({ frame: 'framed', shape: 'pill', className: 'x' })),
    ).toContain(
      'class="kui-content-item kui-content-item--pill kui-content-item--framed x"',
    );
    expect(String(ContentItem({ frame: 'none', shape: 'rounded' }))).toContain(
      'class="kui-content-item" data-component="content-item" data-appearance="transparent"',
    );
  });

  it('projects base and semantic appearances without modifier classes', () => {
    for (const appearance of [
      'surface',
      'neutral',
      'info',
      'pop',
      'success',
      'warning',
      'danger',
    ] as const)
      expect(String(ContentItem({ appearance }))).toContain(
        `data-appearance="${appearance}"`,
      );
  });

  it('becomes a named region and focus target only when asked', () => {
    const html = String(
      ContentItem({ ariaLabel: 'Atlas details', focusTarget: true }),
    );
    expect(html).toContain(
      'role="region" aria-label="Atlas details" tabindex="-1"',
    );
    expect(String(ContentItem({}))).not.toContain('tabindex');
  });

  it('renders bare string copy and escapes it', () => {
    expect(String(ContentItem({ children: 'A < B' }))).toContain(
      '>A &lt; B</div>',
    );
  });

  it('keeps only safe data attributes and protects the component marker', () => {
    const html = String(
      ContentItem({
        rootAttributes: {
          'data-demo-item': 'plain',
          'data-component': 'spoofed',
          'data-appearance': 'danger',
          onclick: 'alert(1)',
        } as never,
      }),
    );
    expect(html).toContain('data-demo-item="plain"');
    expect(html).toContain('data-component="content-item"');
    expect(html).toContain('data-appearance="transparent"');
    expect(html).not.toContain('spoofed');
    expect(html).not.toContain('onclick');
  });
});

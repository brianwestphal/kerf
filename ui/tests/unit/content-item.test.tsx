import { describe, expect, it } from 'vitest';

import { ContentItem } from '../../src/components/surfaces/content-item/content-item.js';
import { fillColor } from '../../src/shared/styles/css-values.js';

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

  it('supports keyboard focus and persistent outline without changing action tab order', () => {
    const item = String(ContentItem({ tabIndex: 0, outlined: true }));
    expect(item).toContain('tabindex="0"');
    expect(item).toContain('data-outlined="true"');
    expect(String(ContentItem({ tabIndex: -1 }))).toContain('tabindex="-1"');
    expect(String(ContentItem({ focusTarget: true, tabIndex: 0 }))).toContain(
      'tabindex="0"',
    );
    expect(
      String(
        ContentItem({
          interactive: true,
          action: 'open',
          outlined: true,
        }),
      ),
    ).toContain('tabindex="0"');
    expect(
      String(
        ContentItem({
          interactive: true,
          action: 'open',
          disabled: true,
          outlined: true,
        }),
      ),
    ).toContain('tabindex="-1"');
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

  it('renders a reserved, lazy media block with a scoped tint and decorative soft copy', () => {
    const html = String(
      ContentItem({
        media: {
          src: '/art.jpg',
          alt: 'Harbor',
          srcset: '/art-2.jpg 2x',
          aspectRatio: 2,
          blurredSrc: '/art-soft.jpg',
          parallax: 0.5,
        },
        tint: { color: fillColor('#283a54'), scheme: 'dark' },
        children: <a href="/source">Source</a>,
      }),
    );
    expect(html).toContain('data-media-state="pending"');
    expect(html).toContain('data-kui-tint="dark"');
    expect(html).toContain('--_kui-content-item-media-ratio:2');
    expect(html).toContain('--_kui-content-item-media-parallax:0.5');
    expect(html).toContain('src="/art.jpg"');
    expect(html).toContain('alt="Harbor" loading="lazy" decoding="async"');
    expect(html).toContain('src="/art-soft.jpg" alt="" aria-hidden="true"');
    expect(html).toContain('<a href="/source">Source</a>');
    expect(
      String(
        ContentItem({ tint: { color: fillColor('#fff'), scheme: 'light' } }),
      ),
    ).not.toContain('data-kui-tint=');
    expect(() =>
      ContentItem({ media: { src: 'x', alt: '', aspectRatio: 0 } }),
    ).toThrow(RangeError);
    expect(() =>
      ContentItem({ media: { src: 'x', alt: '', parallax: 2 } }),
    ).toThrow(RangeError);
    expect(() =>
      ContentItem({
        media: { src: 'x', alt: '', position: 'left;bad' as never },
      }),
    ).toThrow(TypeError);
  });
});

import { describe, expect, it } from 'vitest';

import { ContentSwap } from '../../src/components/layout/content-swap/content-swap.js';

describe('ContentSwap', () => {
  it('renders both sides with only the active one exposed', () => {
    expect(
      String(ContentSwap({ active: 'a', a: <p>One</p>, b: <p>Two</p> })),
    ).toBe(
      '<div class="kui-content-swap" data-component="content-swap" data-active-side="a" data-transition="push" data-direction="forward">' +
        '<div class="kui-content-swap__side" data-side="a" data-active="true"><p>One</p></div>' +
        '<div class="kui-content-swap__side" data-side="b" data-active="false" aria-hidden="true" inert><p>Two</p></div>' +
        '</div>',
    );
  });

  it('carries transition, direction, region name, fill, and slot', () => {
    const html = String(
      ContentSwap({
        active: 'b',
        a: <p>One</p>,
        b: <p>Two</p>,
        transition: 'crossfade',
        direction: 'backward',
        label: 'Connect',
        fill: true,
        className: 'steps',
        slot: 'footer',
      }),
    );
    expect(html).toContain(
      'class="kui-content-swap steps" data-component="content-swap" data-active-side="b" data-transition="crossfade" data-direction="backward" data-fill="true" role="region" aria-label="Connect" slot="footer"',
    );
    expect(html).toContain(
      'data-side="a" data-active="false" aria-hidden="true" inert',
    );
  });
});

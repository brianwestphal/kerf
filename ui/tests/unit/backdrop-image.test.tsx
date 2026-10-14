import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BackdropImage } from '../../src/components/surfaces/backdrop-image/backdrop-image.js';
import {
  colorVar,
  fillColor,
  remify,
  uiColor,
} from '../../src/shared/styles/css-values.js';

const css = readFileSync(
  resolve(
    import.meta.dirname,
    '../../src/components/surfaces/backdrop-image/backdrop-image.css',
  ),
  'utf8',
);

describe('BackdropImage', () => {
  it('renders a static, decorative fitted image by default', () => {
    expect(String(BackdropImage({ src: '/hero.jpg', alt: '' }))).toBe(
      '<div class="kui-backdrop-image" data-component="backdrop-image" data-parallax="none">' +
        '<div class="kui-backdrop-image__hero"><div class="kui-backdrop-image__backdrop">' +
        '<div class="kui-backdrop-image__layers"><img class="kui-backdrop-image__media" src="/hero.jpg" alt="" decoding="async"></div>' +
        '</div></div></div>',
    );
  });

  it('carries height, fade color, parallax factor, position, and fit as private properties', () => {
    const html = String(
      BackdropImage({
        src: '/hero.jpg',
        srcset: '/hero-800.jpg 800w, /hero-1600.jpg 1600w',
        sizes: '100vw',
        alt: 'Harbor at night',
        height: remify(360),
        parallax: 'subtle',
        fadeTo: uiColor('surface'),
        position: 'top left',
        fit: 'contain',
        scrim: 'bottom',
        id: 'artist-hero',
        className: 'hero',
        slot: 'header',
        rootAttributes: { 'data-route': 'artist' },
      }),
    );
    expect(html).toContain(
      'class="kui-backdrop-image hero" data-component="backdrop-image" data-parallax="scroll" data-fade="true" data-scrim="bottom"',
    );
    expect(html).toContain(
      'style="--_kui-backdrop-image-height:22.5rem;--_kui-backdrop-image-fade-to:var(--kui-color-surface);--_kui-backdrop-image-parallax:0.35;--_kui-backdrop-image-position:top left;--_kui-backdrop-image-fit:contain"',
    );
    expect(html).toContain('data-route="artist"');
    expect(html).toContain('id="artist-hero"');
    expect(html).toContain('slot="header"');
    expect(html).toContain(
      'srcset="/hero-800.jpg 800w, /hero-1600.jpg 1600w" sizes="100vw" alt="Harbor at night"',
    );
    expect(html).toContain('<div class="kui-backdrop-image__scrim"></div>');
  });

  it('accepts a numeric lag factor and treats 0 as no parallax', () => {
    expect(
      String(BackdropImage({ src: '/a.jpg', alt: '', parallax: 0.6 })),
    ).toContain(
      'data-parallax="scroll" style="--_kui-backdrop-image-parallax:0.6"',
    );
    expect(
      String(BackdropImage({ src: '/a.jpg', alt: '', parallax: 0 })),
    ).toContain('data-parallax="none"');
    expect(
      String(BackdropImage({ src: '/a.jpg', alt: '', fit: 'cover' })),
    ).not.toContain('style=');
  });

  it('rejects a parallax factor outside 0 to 1', () => {
    for (const parallax of [-0.1, 1.5, Number.NaN])
      expect(() => BackdropImage({ src: '/a.jpg', alt: '', parallax })).toThrow(
        RangeError,
      );
  });

  it('rejects style values that could escape their declaration', () => {
    expect(() =>
      BackdropImage({
        src: '/a.jpg',
        alt: '',
        fadeTo: fillColor('red').replace('red', 'red;x:1') as never,
      }),
    ).toThrow(TypeError);
    expect(() =>
      BackdropImage({ src: '/a.jpg', alt: '', height: ' ' as never }),
    ).toThrow(TypeError);
    expect(
      String(
        BackdropImage({
          src: '/a.jpg',
          alt: '',
          fadeTo: colorVar('--app-hero', fillColor('#123456')),
        }),
      ),
    ).toContain('--_kui-backdrop-image-fade-to:var(--app-hero, #123456)');
  });

  it('tiles the image as an escaped background and exposes alt text as an image', () => {
    const html = String(
      BackdropImage({
        src: '/tile "1".svg',
        alt: 'Pattern',
        repeat: 'repeat-x',
      }),
    );
    expect(html).toContain('data-repeat="repeat-x"');
    expect(html).toContain(
      '<div class="kui-backdrop-image__media" role="img" aria-label="Pattern" style="background-image:url(&quot;/tile \\&quot;1\\&quot;.svg&quot;);background-repeat:repeat-x"></div>',
    );
    const decorative = String(
      BackdropImage({ src: '/tile.svg', alt: '', repeat: 'repeat' }),
    );
    expect(decorative).not.toContain('role="img"');
    expect(decorative).not.toContain('aria-label');
    expect(() =>
      BackdropImage({ src: '/tile\n.svg', alt: '', repeat: 'repeat' }),
    ).toThrow(TypeError);
  });

  it('places overlay content over the image and children below it', () => {
    const html = String(
      BackdropImage({
        src: '/a.jpg',
        alt: '',
        overlay: <h2>Night Harbor</h2>,
        children: <p>Top songs</p>,
      }),
    );
    expect(html).toContain(
      '</div><div class="kui-backdrop-image__overlay"><h2>Night Harbor</h2></div></div>' +
        '<div class="kui-backdrop-image__content"><p>Top songs</p></div></div>',
    );
    const empty = String(
      BackdropImage({ src: '/a.jpg', alt: '', overlay: false, children: null }),
    );
    expect(empty).not.toContain('__overlay');
    expect(empty).not.toContain('__content');
  });
});

describe('BackdropImage blur', () => {
  it('stacks a filtered copy of the image with a default radius', () => {
    const html = String(
      BackdropImage({
        src: '/hero.jpg',
        srcset: '/hero-800.jpg 800w',
        sizes: '100vw',
        alt: 'Harbor',
        blur: {},
      }),
    );
    expect(html).toContain(
      'data-parallax="none" data-blur="filter" style="--_kui-backdrop-image-blur:1.5rem"',
    );
    expect(html).toContain(
      '<img class="kui-backdrop-image__blurred" src="/hero.jpg" srcset="/hero-800.jpg 800w" sizes="100vw" alt="" aria-hidden="true" decoding="async">',
    );
    expect(html).not.toContain('__dim');
  });

  it('uses an app-supplied blurred asset without a filter, plus a dim layer', () => {
    const html = String(
      BackdropImage({
        src: '/hero.jpg',
        srcset: '/hero-800.jpg 800w',
        alt: '',
        blur: { blurredSrc: '/hero-blur.jpg', dim: 0.4 },
      }),
    );
    expect(html).toContain(
      'data-blur="asset" style="--_kui-backdrop-image-dim:0.4"',
    );
    expect(html).toContain(
      '<img class="kui-backdrop-image__blurred" src="/hero-blur.jpg" alt="" aria-hidden="true" decoding="async">',
    );
    expect(html).toContain(
      '</div><div class="kui-backdrop-image__dim"></div></div>',
    );
    expect(
      String(
        BackdropImage({
          src: '/hero.jpg',
          alt: '',
          blur: { blurredSrc: '/hero-blur.jpg', radius: remify(8) },
        }),
      ),
    ).toContain('data-blur="filter" style="--_kui-backdrop-image-blur:0.5rem"');
  });

  it('blurs a tiled image with a hidden decorative copy', () => {
    const html = String(
      BackdropImage({
        src: '/tile.svg',
        alt: 'Pattern',
        repeat: 'repeat',
        blur: { radius: remify(4) },
      }),
    );
    expect(html).toContain(
      '<div class="kui-backdrop-image__blurred" aria-hidden="true" style="background-image:url(&quot;/tile.svg&quot;);background-repeat:repeat"></div>',
    );
  });

  it('rejects a dim outside 0 to 1 and an unsafe radius', () => {
    for (const dim of [-0.1, 2, Number.NaN])
      expect(() =>
        BackdropImage({ src: '/a.jpg', alt: '', blur: { dim } }),
      ).toThrow(RangeError);
    expect(() =>
      BackdropImage({
        src: '/a.jpg',
        alt: '',
        blur: { radius: '4px;x' as never },
      }),
    ).toThrow(TypeError);
  });
});

describe('BackdropImage stylesheet', () => {
  it('drives parallax only through a guarded, transform-only scroll timeline', () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(
      /background-attachment/,
    );
    expect(css).toMatch(
      /@supports \(animation-timeline: view\(\)\) \{\s*@media \(prefers-reduced-motion: no-preference\)/,
    );
    expect(css).toContain('animation-timeline: --kui-backdrop-image;');
    expect(css).toContain(
      'animation-range: exit-crossing 0% exit-crossing 100%;',
    );
    const keyframes =
      /@keyframes kui-backdrop-image-parallax \{([\s\S]*?)\n\}/.exec(css)?.[1];
    expect(keyframes).toBeDefined();
    expect(
      keyframes!.match(/^\s+([a-z-]+):/gm)?.map((line) => line.trim()),
    ).toEqual(['transform:', 'transform:']);
  });

  it('turns parallax and the blur ramp off for static effects and slow displays, and the fade off for reduced transparency', () => {
    const block = (start: RegExp) => {
      const match = start.exec(css);
      expect(match).not.toBeNull();
      return css.slice(match!.index, css.indexOf('}', match!.index) + 1);
    };
    for (const rule of [
      block(/:root\[data-kui-effects="static"\]/),
      block(/@media \(update: slow\) \{/),
    ]) {
      expect(rule).toContain('.kui-backdrop-image[data-parallax="scroll"]');
      expect(rule).toContain('.kui-backdrop-image__layers');
      expect(rule).toContain('.kui-backdrop-image[data-blur]');
      expect(rule).toContain(
        ':is(.kui-backdrop-image__blurred, .kui-backdrop-image__dim)',
      );
      expect(rule).toMatch(/\{\s*animation: none;\s*\}$/);
    }
    expect(css).toMatch(
      /@media \(prefers-reduced-transparency: reduce\), \(prefers-contrast: more\) \{\s*\.kui-backdrop-image\[data-fade="true"\] \.kui-backdrop-image__backdrop \{\s*mask-image: none;/,
    );
    expect(css).toMatch(
      /\.kui-backdrop-image\[data-fade="true"\] \.kui-backdrop-image__overlay \{\s*background-color: var\(--_kui-backdrop-image-fade-to\);/,
    );
  });

  it('ramps only opacity for the blur and never animates the filter', () => {
    const reveal = /@keyframes kui-backdrop-image-reveal \{([\s\S]*?)\n\}/.exec(
      css,
    )?.[1];
    expect(
      reveal!.match(/^\s+([a-z-]+):/gm)?.map((line) => line.trim()),
    ).toEqual(['opacity:', 'opacity:']);
    for (const [, body] of css.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\n\}/g))
      expect(body).not.toContain('filter');
    expect(css).toMatch(
      /\.kui-backdrop-image\[data-blur="filter"\] \.kui-backdrop-image__blurred \{[^}]*filter: blur\(var\(--_kui-backdrop-image-blur\)\);/,
    );
  });
});

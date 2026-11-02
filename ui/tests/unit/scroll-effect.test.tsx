import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ScrollEffect,
  type ScrollEffectSpec,
} from '../../src/components/surfaces/scroll-effect/scroll-effect.js';
import { scrollEffectLayerStyle } from '../../src/shared/styles/scroll-effect-layer.js';

const css = readFileSync(
  resolve(
    import.meta.dirname,
    '../../src/components/surfaces/scroll-effect/scroll-effect.css',
  ),
  'utf8',
);

const render = (effects: readonly ScrollEffectSpec[], children = <p>Hi</p>) =>
  String(ScrollEffect({ effects, children }));

const layer = (family: string, from: number, to: number, range: string) =>
  `<div class="kui-scroll-effect__layer" data-kui-scroll-effect="${family}" style="--_kui-scroll-effect-from:${String(from)};--_kui-scroll-effect-to:${String(to)};--_kui-scroll-effect-range:${range}">`;

describe('ScrollEffect', () => {
  it('renders a timeline subject around unchanged content when there are no effects', () => {
    expect(render([])).toBe(
      '<div class="kui-scroll-effect" data-component="scroll-effect" data-kui-scroll-timeline=""><p>Hi</p></div>',
    );
  });

  it('maps each preset to its keyframe family, values, and default range', () => {
    expect(render([{ kind: 'reveal' }])).toContain(
      `${layer('opacity', 0, 1, 'entry 0% entry 100%')}<p>Hi</p></div>`,
    );
    expect(render([{ kind: 'fade' }])).toContain(
      layer('opacity', 1, 0, 'exit 0% exit 100%'),
    );
    const scale = render([{ kind: 'scale' }]);
    expect(scale).toContain(layer('scale', 0.96, 1, 'entry 0% entry 100%'));
    expect(scale).not.toContain('data-clip');
    expect(render([{ kind: 'scale', from: 1, to: 1.2 }])).toContain(
      'data-clip="true"',
    );
    const parallax = render([{ kind: 'parallax' }]);
    expect(parallax).toContain(
      layer('translate', 0, 0.35, 'exit 0% exit 100%'),
    );
    expect(parallax).toContain('data-clip="true"');
  });

  it('anchors the parallax offset to the range so content rests in place', () => {
    expect(render([{ kind: 'parallax', lag: 0.5, range: 'entry' }])).toContain(
      layer('translate', -0.5, 0, 'entry 0% entry 100%'),
    );
    expect(render([{ kind: 'parallax', lag: 0.5, range: 'cover' }])).toContain(
      layer('translate', -0.25, 0.25, 'cover 0% cover 100%'),
    );
    expect(
      render([{ kind: 'parallax', lag: 'subtle', range: 'contain' }]),
    ).toContain(layer('translate', -0.175, 0.175, 'contain 0% contain 100%'));
  });

  it('places a dim overlay over the content and honors range percentages', () => {
    expect(
      render([
        { kind: 'dim', to: 0.3, range: 'cover', rangeStart: 50, rangeEnd: 75 },
      ]),
    ).toBe(
      '<div class="kui-scroll-effect" data-component="scroll-effect" data-kui-scroll-timeline=""><p>Hi</p>' +
        '<div class="kui-scroll-effect__dim" aria-hidden="true" data-kui-scroll-effect="opacity" style="--_kui-scroll-effect-from:0;--_kui-scroll-effect-to:0.3;--_kui-scroll-effect-range:cover 50% cover 75%"></div></div>',
    );
    expect(render([{ kind: 'dim' }])).toContain(
      '--_kui-scroll-effect-to:0.5;--_kui-scroll-effect-range:exit 0% exit 100%',
    );
  });

  it('nests layers in array order so transforms stack and opacities multiply', () => {
    const html = render([
      { kind: 'reveal', range: 'entry' },
      { kind: 'fade', range: 'exit' },
      { kind: 'scale', from: 0.9 },
    ]);
    expect(html).toContain(
      layer('opacity', 0, 1, 'entry 0% entry 100%') +
        layer('opacity', 1, 0, 'exit 0% exit 100%') +
        layer('scale', 0.9, 1, 'entry 0% entry 100%') +
        '<p>Hi</p></div></div></div>',
    );
  });

  it('keeps its own markers protected from rootAttributes', () => {
    const html = String(
      ScrollEffect({
        effects: [],
        rootAttributes: {
          'data-node': 'hero',
          'data-component': 'other',
          'data-kui-scroll-timeline': 'x',
        },
      }),
    );
    expect(html).toContain('data-node="hero"');
    expect(html).not.toContain('data-component="other"');
    expect(html).not.toContain('data-kui-scroll-timeline="x"');
  });

  it('rejects out-of-range values, bad ranges, and unknown kinds, and stacks a repeated kind', () => {
    const bad: unknown[] = [
      { kind: 'parallax', lag: 1.5 },
      { kind: 'parallax', lag: -0.1 },
      { kind: 'parallax', lag: Number.NaN },
      { kind: 'scale', from: 0 },
      { kind: 'scale', to: 3 },
      { kind: 'dim', to: 1.2 },
      { kind: 'reveal', rangeStart: -1 },
      { kind: 'reveal', rangeEnd: 101 },
      { kind: 'reveal', rangeStart: 60, rangeEnd: 40 },
    ];
    for (const effect of bad)
      expect(() => render([effect as ScrollEffectSpec])).toThrow(RangeError);
    expect(() =>
      render([{ kind: 'reveal', range: 'middle' } as never]),
    ).toThrow(TypeError);
    expect(() => render([{ kind: 'wobble' } as never])).toThrow(TypeError);
    expect(
      render([{ kind: 'dim' }, { kind: 'dim', to: 0.2 }]).match(
        /kui-scroll-effect__dim/g,
      ),
    ).toHaveLength(2);
  });
});

describe('shared scroll-effect layer', () => {
  it('formats only the inputs it is given and rejects an unsafe range', () => {
    expect(
      scrollEffectLayerStyle({
        family: 'opacity',
        range: 'exit-crossing 0% exit-crossing 50%',
      }),
    ).toBe('--_kui-scroll-effect-range:exit-crossing 0% exit-crossing 50%');
    expect(() =>
      scrollEffectLayerStyle({ family: 'opacity', range: 'cover;x:1' }),
    ).toThrow(TypeError);
  });

  it('animates only transform and opacity, on a guarded named view timeline', () => {
    expect(css).toMatch(
      /\[data-kui-scroll-timeline\] \{\s*view-timeline-name: --kui-scroll-effect;\s*view-timeline-axis: block;/,
    );
    expect(css).toMatch(
      /@supports \(animation-timeline: view\(\)\) \{\s*@media \(prefers-reduced-motion: no-preference\) \{\s*\[data-kui-scroll-effect\] \{[^}]*animation-timeline: --kui-scroll-effect;\s*animation-range: var\(--_kui-scroll-effect-range\);/,
    );
    const properties = [
      ...css.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\n\}/g),
    ].flatMap(([, body]) =>
      body.match(/^\s+([a-z-]+):/gm)!.map((line) => line.trim()),
    );
    expect(new Set(properties)).toEqual(new Set(['transform:', 'opacity:']));
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(
      /background-attachment|filter/,
    );
  });

  it('turns every layer off for static effects, slow displays, reduced transparency, contrast, and forced colors', () => {
    expect(css).toMatch(
      /:root\[data-kui-effects="static"\] \[data-kui-scroll-effect\] \{\s*animation: none;\s*\}/,
    );
    expect(css).toMatch(
      /@media \(update: slow\),\s*\(prefers-reduced-transparency: reduce\),\s*\(prefers-contrast: more\),\s*\(forced-colors: active\) \{\s*\[data-kui-scroll-effect\] \{\s*animation: none;/,
    );
  });
});

import { fillColor } from '@kerfjs/ui/css-values';
import { Pane } from '@kerfjs/ui/pane';

// Scoped tint sweep (KF-RYZ0HJ): one tinted Pane per seed color and declared
// scheme. Each holds probes the spec resolves to measure the re-derived
// surface and text tokens.
export const TINT_SEEDS = [
  '#ff0000',
  '#ffd60a',
  '#00c853',
  '#00b8d4',
  '#2962ff',
  '#aa00ff',
  '#ff4081',
  '#795548',
  '#000000',
  '#ffffff',
  '#808080',
  '#e6edfb',
  '#1b2438',
  'oklch(60% 0.3 140)',
] as const;

const probe = (name: string, style: string) => (
  <span data-probe={name} style={`display:block;height:4px;${style}`} />
);

const app = document.querySelector<HTMLElement>('[data-app]')!;
app.innerHTML = String(
  <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px">
    {(['light', 'dark'] as const).flatMap((scheme) =>
      TINT_SEEDS.map((seed) => (
        <section
          data-seed={seed}
          data-scheme={scheme}
          style="display:grid;height:120px;width:160px"
        >
          <Pane
            label={`${seed} ${scheme}`}
            safeAreaEdges={[]}
            tint={{ color: fillColor(seed), scheme }}
          >
            <span data-text>Text</span>
            {probe('surface', 'background:var(--kui-color-surface)')}
            {probe('raised', 'background:var(--kui-color-surface-raised)')}
            {probe('lowered', 'background:var(--kui-color-surface-lowered)')}
            {probe(
              'fill-quiet',
              'background:var(--kui-color-neutral-fill-quiet)',
            )}
            {probe('text', 'color:var(--kui-color-text)')}
            {probe('quiet', 'color:var(--kui-color-text-quiet)')}
            {probe(
              'neutral-on-quiet',
              'color:var(--kui-color-neutral-on-quiet)',
            )}
            {probe('link', 'color:var(--kui-color-text-link)')}
          </Pane>
        </section>
      )),
    )}
  </div>,
);

// Accent seeds: each tint scheme with a vivid accent re-derives its brand
// ramp; the spec measures the brand pairs those tokens paint.
export const ACCENT_SEEDS = [
  '#ff0000',
  '#ffd60a',
  '#00c853',
  '#00b8d4',
  '#2962ff',
  '#aa00ff',
  '#ff4081',
  '#808080',
  '#000000',
  '#ffffff',
] as const;

const accentHost = document.createElement('div');
accentHost.setAttribute('data-accents', '');
app.append(accentHost);
accentHost.innerHTML = String(
  <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px">
    {(['light', 'dark'] as const).flatMap((scheme) =>
      ACCENT_SEEDS.map((accent) => (
        <section
          data-accent={accent}
          data-scheme={scheme}
          style="display:grid;height:80px;width:120px"
        >
          <Pane
            label={`${accent} ${scheme}`}
            safeAreaEdges={[]}
            tint={{
              color: fillColor(scheme === 'light' ? '#e6edfb' : '#1b2438'),
              scheme,
              accent: fillColor(accent),
            }}
          >
            {probe('fill-loud', 'background:var(--kui-color-brand-fill-loud)')}
            {probe(
              'fill-normal',
              'background:var(--kui-color-brand-fill-normal)',
            )}
            {probe('on-loud', 'color:var(--kui-color-brand-on-loud)')}
            {probe('on-quiet', 'color:var(--kui-color-brand-on-quiet)')}
            {probe('on-fill', 'color:var(--kui-color-brand-on-fill)')}
            {probe('link', 'color:var(--kui-color-text-link)')}
          </Pane>
        </section>
      )),
    )}
  </div>,
);

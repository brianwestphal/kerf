import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { RadioGroup } from '@kerfjs/ui/radio-group';

import { radioDensity, radioTheme } from './state.js';

/** The colors a scheme preview draws its miniature app window in. */
const SCHEMES = {
  light: {
    canvas: '#ffffff',
    rail: '#eef1f5',
    bar: '#cfd6e0',
    accent: '#3b6fd8',
  },
  dark: {
    canvas: '#1c1f26',
    rail: '#272b34',
    bar: '#454c59',
    accent: '#6f9bff',
  },
} as const;

/** One scheme's window: a sidebar of rows beside a title and content bars. */
function schemeWindow(scheme: keyof typeof SCHEMES, clip?: string) {
  const { canvas, rail, bar, accent } = SCHEMES[scheme];
  return (
    <g clip-path={clip}>
      <rect width="120" height="90" fill={canvas} />
      <rect width="34" height="90" fill={rail} />
      <rect x="6" y="10" width="22" height="5" rx="2.5" fill={accent} />
      <rect x="6" y="21" width="18" height="4" rx="2" fill={bar} />
      <rect x="6" y="30" width="20" height="4" rx="2" fill={bar} />
      <rect x="44" y="10" width="44" height="7" rx="3.5" fill={bar} />
      <rect x="44" y="26" width="66" height="4" rx="2" fill={bar} />
      <rect x="44" y="35" width="58" height="4" rx="2" fill={bar} />
      <rect x="44" y="44" width="62" height="4" rx="2" fill={bar} />
    </g>
  );
}

/** Decorative artwork of the app in a scheme; Auto splits light and dark. */
function schemePreview(scheme: 'auto' | 'light' | 'dark') {
  return (
    <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice">
      {scheme === 'auto' ? (
        <>
          <clipPath id="radio-theme-auto-dark">
            <polygon points="120,0 120,90 0,90" />
          </clipPath>
          {schemeWindow('light')}
          {schemeWindow('dark', 'url(#radio-theme-auto-dark)')}
        </>
      ) : (
        schemeWindow(scheme)
      )}
    </svg>
  );
}

export function RadioGroupDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'radio-group' }}>
      <CatalogExample
        label="Vertical"
        note="One Tab stop; the arrow keys move and select. A choice may carry its own hint."
        align="inline-control"
      >
        <RadioGroup
          label="Layout Density"
          name="layout-density"
          value={radioDensity.value}
          hint="Applies to every list."
          action="radio-group-demo"
          choices={[
            { value: 'compact', label: 'Compact' },
            { value: 'balanced', label: 'Balanced' },
            {
              value: 'roomy',
              label: 'Roomy',
              hint: 'Larger rows for touch screens.',
            },
            { value: 'custom', label: 'Custom', disabled: true },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Horizontal and Compact"
        note="Short choices can line up and wrap; an error marks the group invalid."
        align="inline-control"
      >
        <RadioGroup
          label="Release Channel"
          name="release-channel"
          size="compact"
          orientation="horizontal"
          required
          error="Choose a channel."
          action="radio-group-demo"
          choices={[
            { value: 'stable', label: 'Stable' },
            { value: 'beta', label: 'Beta' },
            { value: 'nightly', label: 'Nightly' },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Preview Tiles"
        note='presentation="tiles" draws each choice as a framed preview above its label, for choices best told apart by a picture. A ring and a check mark the selection, the grid wraps whole tiles, and the radios keep one Tab stop with arrow-key selection.'
        align="inline-control"
      >
        <RadioGroup
          label="Theme"
          name="appearance-theme"
          presentation="tiles"
          value={radioTheme.value}
          action="radio-group-demo"
          choices={[
            {
              value: 'auto',
              label: 'Auto',
              hint: 'Follows the system.',
              preview: schemePreview('auto'),
            },
            { value: 'light', label: 'Light', preview: schemePreview('light') },
            { value: 'dark', label: 'Dark', preview: schemePreview('dark') },
          ]}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

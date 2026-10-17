import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { type ColorSwatch, ColorSwatches } from '@kerfjs/ui/color-swatches';
import { fillColor } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { signal } from 'kerfjs';

/** The delegated action every demo swatch group reports its choice through. */
export const PICK_SWATCH_DEMO_ACTION = 'pick-swatch-demo';

const PALETTE: readonly ColorSwatch[] = [
  { value: 'none', label: 'No Color', color: 'transparent' },
  { value: '#ff3b30', label: 'Red', color: fillColor('#ff3b30') },
  { value: '#ff9500', label: 'Orange', color: fillColor('#ff9500') },
  { value: '#ffcc00', label: 'Yellow', color: fillColor('#ffcc00') },
  { value: '#34c759', label: 'Green', color: fillColor('#34c759') },
  { value: '#00c7be', label: 'Teal', color: fillColor('#00c7be') },
  { value: '#0a84ff', label: 'Blue', color: fillColor('#0a84ff') },
  { value: '#5e5ce6', label: 'Indigo', color: fillColor('#5e5ce6') },
  { value: '#bf5af2', label: 'Purple', color: fillColor('#bf5af2') },
  { value: '#ff375f', label: 'Pink', color: fillColor('#ff375f') },
  { value: '#8e8e93', label: 'Gray', color: fillColor('#8e8e93') },
];

const INITIAL = { 'command-color': '#0a84ff', 'label-color': 'none' } as const;
const chosen = signal<Record<string, string>>({ ...INITIAL });

/** Record a demo group's chosen value so a re-render keeps it. */
export function pickSwatchDemo(name: string, value: string): void {
  if (name in INITIAL) chosen.value = { ...chosen.value, [name]: value };
}

export function resetColorSwatchesDemo(): void {
  chosen.value = { ...INITIAL };
}

export function ColorSwatchesDemo() {
  const current = chosen.value;
  return (
    <CatalogExampleStack
      label="ColorSwatches Variants"
      rootAttributes={{ 'data-demo': 'color-swatches' }}
    >
      <CatalogExample
        label="Fixed Palette"
        align="inline-control"
        note="A native radio group: Tab reaches it once, the arrow keys move the choice, and the chosen value submits under name. Each swatch is named by its color (also its hover hint); the chosen one wears a ring that does not depend on its hue."
        viewport={{ width: 'medium' }}
      >
        <ColorSwatches
          name="command-color"
          label="Command Color"
          swatches={PALETTE.slice(1)}
          value={current['command-color']}
          action={PICK_SWATCH_DEMO_ACTION}
        />
      </CatalogExample>
      <CatalogExample
        label="No Color, Compact, and Disabled"
        align="inline-control"
        note="A 'transparent' swatch offers no color, drawn outlined and struck through; size compact draws 20px swatches."
        viewport={{ width: 'medium' }}
      >
        <List gap="m">
          <ColorSwatches
            name="label-color"
            label="Label Color"
            swatches={PALETTE}
            value={current['label-color']}
            size="compact"
            action={PICK_SWATCH_DEMO_ACTION}
          />
          <ColorSwatches
            name="locked-color"
            label="Locked Color"
            swatches={PALETTE.slice(1, 6)}
            value="#34c759"
            size="compact"
            disabled
          />
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

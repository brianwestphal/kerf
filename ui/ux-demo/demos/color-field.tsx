import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ColorField } from '@kerfjs/ui/color-field';
import type { ColorPickerMode } from '@kerfjs/ui/color-picker';
import type { ColorSwatch } from '@kerfjs/ui/color-swatches';
import { fillColor } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { signal } from 'kerfjs';

/** The presets the demo's color fields open with, keyed by field id. */
export const COLOR_FIELD_DEMO_PRESETS: readonly ColorSwatch[] = [
  '#ff3b30',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#0a84ff',
  '#5e5ce6',
  '#bf5af2',
  '#8e8e93',
].map((value) => ({
  value,
  label: value.toUpperCase(),
  color: fillColor(value),
}));

const INITIAL: Record<string, { value: string; mode: ColorPickerMode }> = {
  'color-field-demo-fill': { value: '#0a84ff', mode: 'rgb' },
  'color-field-demo-border': { value: '#1c1c1e80', mode: 'hsl' },
};
const fields = signal({ ...INITIAL });

/** Record a demo field's committed color and model. */
export function setColorFieldDemo(
  id: string,
  value: string,
  mode: ColorPickerMode,
): void {
  if (id in INITIAL) fields.value = { ...fields.value, [id]: { value, mode } };
}

export function resetColorFieldDemo(): void {
  fields.value = { ...INITIAL };
}

export function ColorFieldDemo() {
  const current = fields.value;
  const fill = current['color-field-demo-fill']!;
  const border = current['color-field-demo-border']!;
  return (
    <CatalogExampleStack
      label="ColorField Variants"
      rootAttributes={{ 'data-demo': 'color-field' }}
    >
      <CatalogExample
        label="Color Fields"
        align="inline-control"
        note="The trigger shows the color as a swatch (over a checkerboard, so opacity reads) and its hex value. Pressing it opens a ColorPicker below; edits preview on the trigger at once, Escape or a press outside closes it, and focus returns to the trigger."
        viewport={{ width: 'compact' }}
      >
        <List gap="m">
          <ColorField
            id="color-field-demo-fill"
            label="Fill"
            name="fill"
            value={fill.value}
            mode={fill.mode}
            hint="Applies to the selected shapes."
          />
          <ColorField
            id="color-field-demo-border"
            label="Border"
            name="border"
            value={border.value}
            mode={border.mode}
            size="compact"
          />
          <ColorField
            id="color-field-demo-locked"
            label="Theme Accent"
            value="#bf5af2"
            alpha={false}
            disabled
            error="The theme locks this color."
          />
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

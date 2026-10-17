import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ColorPicker, type ColorPickerMode } from '@kerfjs/ui/color-picker';
import type { ColorSwatch } from '@kerfjs/ui/color-swatches';
import { fillColor } from '@kerfjs/ui/css-values';
import { signal } from 'kerfjs';

/** The delegated action the demo's "Add to Samples" button carries. */
export const ADD_COLOR_SAMPLE_DEMO_ACTION = 'add-color-sample-demo';

const PRESETS: readonly ColorSwatch[] = [
  '#ff3b30',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#00c7be',
  '#0a84ff',
  '#5e5ce6',
  '#bf5af2',
  '#ff375f',
  '#8e8e93',
].map((value) => ({
  value,
  label: value.toUpperCase(),
  color: fillColor(value),
}));

const INITIAL = { value: '#d8d8d8', mode: 'rgb' as ColorPickerMode };
const picked = signal({ ...INITIAL });
const userColors = signal<readonly string[]>(['#1e3a8a', '#f59e0b']);

/** Record the demo picker's committed color and model. */
export function setColorPickerDemo(value: string, mode: ColorPickerMode): void {
  picked.value = { value, mode };
}

/** Add the picker's current color to the demo's user colors. */
export function addColorSampleDemo(): void {
  const { value } = picked.value;
  if (!userColors.value.includes(value))
    userColors.value = [...userColors.value, value];
}

export function resetColorPickerDemo(): void {
  picked.value = { ...INITIAL };
  userColors.value = ['#1e3a8a', '#f59e0b'];
}

export function ColorPickerDemo() {
  const { value, mode } = picked.value;
  return (
    <CatalogExampleStack
      label="ColorPicker Variants"
      rootAttributes={{ 'data-demo': 'color-picker' }}
    >
      <CatalogExample
        label="Full Picker"
        note="Each slider previews its channel and follows the model. Add saves the current color to User Colors."
      >
        <ColorPicker
          id="color-picker-demo"
          label="Fill Color"
          value={value}
          mode={mode}
          name="fill"
          presets={PRESETS}
          samples={[
            {
              title: 'User Colors',
              swatches: userColors.value.map((color) => ({
                value: color,
                label: color.toUpperCase(),
                color: fillColor(color),
              })),
            },
          ]}
          addSampleAction={ADD_COLOR_SAMPLE_DEMO_ACTION}
        />
      </CatalogExample>
      <CatalogExample
        label="Without Opacity"
        note="alpha false drops the opacity slider and field, leaving the HSB model its hue, saturation, and brightness sliders; the value is always opaque #rrggbb."
      >
        <ColorPicker
          id="color-picker-demo-opaque"
          label="Text Color"
          value="#0a84ff"
          mode="hsb"
          alpha={false}
          eyedropper={false}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

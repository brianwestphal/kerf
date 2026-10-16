import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { remify } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { Slider } from '@kerfjs/ui/slider';
import { signal } from 'kerfjs';

/** The delegated action every demo Slider reports its value through. */
export const SET_SLIDER_DEMO_ACTION = 'set-slider-demo';

const INITIAL = { volume: 30, zoom: 100, opacity: 80, level: 60 } as const;
type SliderDemoId = keyof typeof INITIAL;
const values = signal<Record<SliderDemoId, number>>({ ...INITIAL });

/** Record a demo Slider's committed value so a re-render keeps it. */
export function setSliderDemoValue(id: string, value: number): void {
  if (id in INITIAL) values.value = { ...values.value, [id]: value };
}

export function resetSliderDemo(): void {
  values.value = { ...INITIAL };
}

export function SliderDemo() {
  const current = values.value;
  return (
    <CatalogExampleStack
      label="Slider Variants"
      rootAttributes={{ 'data-demo': 'slider' }}
    >
      <CatalogExample
        label="Labeled with a Readout"
        note="A native range input drawn as a track, a fill up to the value, and a thumb; the readout and fill follow a drag through wireSliders. Arrow keys, Page Up and Down, Home, and End step it."
        viewport={{ width: 'medium' }}
      >
        <Slider
          id="slider-demo-volume"
          label="Volume"
          value={current.volume}
          showValue
          unit="%"
          hint="Applies to every output device."
          action={SET_SLIDER_DEMO_ACTION}
        />
      </CatalogExample>
      <CatalogExample
        label="Stepped with Ticks"
        note="step snaps the value; ticks label stops under the track, each centered under the thumb at that value."
        viewport={{ width: 'medium' }}
      >
        <Slider
          id="slider-demo-zoom"
          label="Zoom"
          value={current.zoom}
          min={50}
          max={200}
          step={25}
          showValue
          unit="%"
          ticks={[
            { value: 50, label: '50%' },
            { value: 100, label: '100%' },
            { value: 150, label: '150%' },
            { value: 200, label: '200%' },
          ]}
          action={SET_SLIDER_DEMO_ACTION}
        />
      </CatalogExample>
      <CatalogExample
        label="Compact and Disabled"
        note="size compact is a thinner track, a smaller thumb, and 14px text; a disabled slider dims and refuses input."
        viewport={{ width: 'medium' }}
      >
        <List gap="xs">
          <Slider
            id="slider-demo-opacity"
            label="Layer Opacity"
            value={current.opacity}
            showValue
            unit="%"
            size="compact"
            action={SET_SLIDER_DEMO_ACTION}
          />
          <Slider
            id="slider-demo-locked"
            label="Locked Setting"
            value={40}
            disabled
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Vertical"
        note='orientation="vertical" stands the slider up, minimum at the bottom, length tall (here 120px), for a volume control in a popup; arrow keys still step it and the fill runs upward.'
      >
        <Slider
          id="slider-demo-level"
          label="Level"
          value={current.level}
          showValue
          unit="%"
          size="compact"
          orientation="vertical"
          length={remify(120)}
          action={SET_SLIDER_DEMO_ACTION}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

import '@kerfjs/ui/select/register';

import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { Pane } from '@kerfjs/ui/pane';
import {
  ScrollEffect,
  type ScrollEffectRange,
  type ScrollEffectSpec,
} from '@kerfjs/ui/scroll-effect';
import { Select } from '@kerfjs/ui/select';
import { signal } from 'kerfjs';

import { DemoContentItem } from './demo-content-item.js';

/** The playground's effect preset, chosen in the Settings pane. */
export type ScrollEffectDemoPreset =
  'reveal' | 'fade' | 'reveal-fade' | 'scale' | 'parallax' | 'dim';

export interface ScrollEffectPlaygroundState {
  preset: ScrollEffectDemoPreset;
  range: 'default' | ScrollEffectRange;
}

const INITIAL: ScrollEffectPlaygroundState = {
  preset: 'reveal-fade',
  range: 'default',
};

export const scrollEffectPlayground =
  signal<ScrollEffectPlaygroundState>(INITIAL);

/** Return the playground to its documented state. */
export function resetScrollEffectDemo(): void {
  scrollEffectPlayground.value = INITIAL;
}

const PRESETS: { value: ScrollEffectDemoPreset; label: string }[] = [
  { value: 'reveal-fade', label: 'Reveal and Fade' },
  { value: 'reveal', label: 'Reveal' },
  { value: 'fade', label: 'Fade' },
  { value: 'scale', label: 'Scale' },
  { value: 'parallax', label: 'Parallax' },
  { value: 'dim', label: 'Dim' },
];

const RANGES: { value: ScrollEffectPlaygroundState['range']; label: string }[] =
  [
    { value: 'default', label: 'Preset Default' },
    { value: 'entry', label: 'Entry' },
    { value: 'exit', label: 'Exit' },
    { value: 'cover', label: 'Cover' },
    { value: 'contain', label: 'Contain' },
  ];

/** Apply one ScrollEffect settings Select change; false when it is not one. */
export function applyScrollEffectSetting(
  name: string | null,
  value: string,
): boolean {
  if (name === 'scroll-effect-preset') {
    const preset = PRESETS.find((choice) => choice.value === value);
    if (!preset) return false;
    scrollEffectPlayground.value = {
      ...scrollEffectPlayground.value,
      preset: preset.value,
    };
    return true;
  }
  if (name === 'scroll-effect-range') {
    const range = RANGES.find((choice) => choice.value === value);
    if (!range) return false;
    scrollEffectPlayground.value = {
      ...scrollEffectPlayground.value,
      range: range.value,
    };
    return true;
  }
  return false;
}

function playgroundEffects({
  preset,
  range,
}: ScrollEffectPlaygroundState): ScrollEffectSpec[] {
  const chosen = range === 'default' ? {} : { range };
  switch (preset) {
    case 'reveal-fade':
      return [
        { kind: 'reveal', ...chosen },
        { kind: 'fade', ...chosen },
      ];
    case 'reveal':
      return [{ kind: 'reveal', ...chosen }];
    case 'fade':
      return [{ kind: 'fade', ...chosen }];
    case 'scale':
      return [{ kind: 'scale', from: 0.85, ...chosen }];
    case 'parallax':
      return [{ kind: 'parallax', lag: 0.5, ...chosen }];
    case 'dim':
      return [{ kind: 'dim', to: 0.6, ...chosen }];
  }
}

/** The ScrollEffect entry's catalog settings: preset, range, and a reset. */
export function ScrollEffectSettings() {
  const { preset, range } = scrollEffectPlayground.value;
  return (
    <>
      <ListInsetControl sides="trl">
        <Select
          name="scroll-effect-preset"
          label="Effect"
          value={preset}
          choices={PRESETS}
        />
      </ListInsetControl>
      <ListInsetControl sides="trl">
        <Select
          name="scroll-effect-range"
          label="Range"
          value={range}
          choices={RANGES}
        />
      </ListInsetControl>
      <ListInsetControl sides="trbl">
        <Button action="scroll-effect-reset">Reset</Button>
      </ListInsetControl>
    </>
  );
}

const STORIES = [
  ['Harbor Survey', 'Tide tables and mooring notes for the north basin.'],
  ['Night Ferry', 'Crossing times, crew rotation, and the late timetable.'],
  ['Lantern Walk', 'The coastal path from the lighthouse to the old pier.'],
  ['Salt Works', 'How the evaporation ponds run through the summer.'],
  ['Glass Coast', 'Sea glass, the beaches that collect it, and why.'],
  ['Low Tide', 'The rock pools that open at the lowest tides of the year.'],
  ['Harbor Lights', 'Who keeps the channel lights lit through the winter.'],
  ['Northbound', 'The coastal train, its stops, and the views between them.'],
  ['Undertow', 'Reading the water before a swim off the west beach.'],
  ['Morning Swell', 'Surf reports, wind, and when the swell turns.'],
  ['Last Call', 'The harbor bars that stay open for the late ferry.'],
  ['Salt Air', 'What the sea breeze does to the town gardens.'],
] as const;

/** Enough cards around the target that it can enter and leave the view. */
const FILLER = Array.from({ length: 10 }, (_, index) => index + 1);

function Filler({ label }: { label: string }) {
  return (
    <DemoContentItem
      title={label}
      detail="Scroll the pane to move Night Harbor through the view."
    />
  );
}

export function ScrollEffectDemo() {
  const state = scrollEffectPlayground.value;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'scroll-effect' }}>
      <CatalogExample
        label="Playground"
        note="Scroll the pane: the Night Harbor card runs the effect chosen in the Settings pane over its own position in the scroller. Only transform and opacity animate; under reduced motion or without scroll-driven animations the card stays in place, fully visible."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          frame: 'solid',
        }}
      >
        <Pane
          label="Playground"
          rootAttributes={{ 'data-scroll-effect-demo': 'playground' }}
        >
          <List>
            {FILLER.map((index) => (
              <Filler label={`Earlier Story ${String(index)}`} />
            ))}
            <ScrollEffect
              effects={playgroundEffects(state)}
              rootAttributes={{ 'data-scroll-effect-target': '' }}
            >
              <DemoContentItem
                title="Night Harbor"
                detail="This card carries the effect. Change the preset or its range in Settings."
              />
            </ScrollEffect>
            {FILLER.map((index) => (
              <Filler label={`Later Story ${String(index)}`} />
            ))}
          </List>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Reveal and Fade in a Feed"
        note="Each card fades and scales in over the first half of its entry and fades out over its exit; the effects compose, nested in list order."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          frame: 'solid',
        }}
      >
        <Pane
          label="Feed"
          rootAttributes={{ 'data-scroll-effect-demo': 'feed' }}
        >
          <List>
            {STORIES.map(([title, detail]) => (
              <ScrollEffect
                effects={[
                  { kind: 'reveal', range: 'entry', rangeEnd: 50 },
                  { kind: 'scale', from: 0.94, range: 'entry', rangeEnd: 50 },
                  { kind: 'fade', range: 'exit' },
                ]}
              >
                <DemoContentItem title={title} detail={detail} />
              </ScrollEffect>
            ))}
          </List>
        </Pane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { fillColor, remify } from '@kerfjs/ui/css-values';
import { Gauge } from '@kerfjs/ui/gauge';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { signal } from 'kerfjs';

/** The delegated action that changes the demo rate; its `data-step` is +1/-1. */
export const STEP_GAUGE_DEMO_ACTION = 'step-gauge-demo';

const MAX_RATE = 1000;
const STEP = 150;
/** The demo's tokens per minute; it may run past the scale to show pinning. */
export const gaugeDemoRate = signal(420);

/** Raise or lower the demo rate by one step, never below zero. */
export function stepGaugeDemo(direction: number): number {
  gaugeDemoRate.value = Math.max(0, gaugeDemoRate.value + direction * STEP);
  return gaugeDemoRate.value;
}

export function resetGaugeDemo(): void {
  gaugeDemoRate.value = 420;
}

const NIGHT = {
  track: fillColor('#2a0606'),
  fill: fillColor('#a30d0d'),
  needle: fillColor('#d63a3a'),
  text: fillColor('#d63a3a'),
};

export function GaugeDemo() {
  const rate = gaugeDemoRate.value;
  const shared = { value: rate, max: MAX_RATE, label: 'Tokens per Minute' };
  return (
    <CatalogExampleStack
      label="Gauge Variants"
      rootAttributes={{ 'data-demo': 'gauge' }}
    >
      <CatalogExample
        label="Full"
        note="Ticks, the value, and the unit sit inside the dial, which scales from a stats tile (88px, the default) to a standby display. Speed Up past 1000 pins the needle at the end while the text keeps the real value."
        align="inline-control"
      >
        <Row gap="m" vAlign="middle" wrap>
          <Gauge {...shared} unit="tok/min" />
          <Gauge
            {...shared}
            label="Tokens per Minute, Standby"
            unit="tok/min"
            size={remify(220)}
          />
          <Button
            action={STEP_GAUGE_DEMO_ACTION}
            rootAttributes={{ 'data-step': '-1' }}
          >
            Slow Down
          </Button>
          <Button
            action={STEP_GAUGE_DEMO_ACTION}
            rootAttributes={{ 'data-step': '1' }}
          >
            Speed Up
          </Button>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Bare"
        note="The arc, fill, and needle alone, at chip height (40px). The value is in the accessible name and the hover title."
        align="inline-control"
      >
        <Row gap="s" vAlign="middle">
          <Gauge
            {...shared}
            label="Agent Tokens per Minute"
            unit="tok/min"
            variant="bare"
          />
          <Text>Agent activity</Text>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Tones and Colors"
        note="tone colors the fill from the semantic ramps. colors takes typed CssColor values for a consumer palette, such as dark red for a night display."
        align="inline-control"
      >
        <Row gap="m" vAlign="middle" wrap>
          <Gauge
            label="Tickets Updated per Hour"
            value={18}
            max={40}
            unit="per hour"
            tone="success"
          />
          <Gauge label="Queue Depth" value={72} max={100} tone="warning" />
          <Gauge
            label="Error Rate"
            value={9.5}
            max={10}
            unit="%"
            tone="danger"
          />
          <Gauge
            {...shared}
            label="Tokens per Minute, Night"
            unit="tok/min"
            colors={NIGHT}
          />
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

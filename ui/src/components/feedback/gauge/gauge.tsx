import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import {
  type CssColor,
  type CssLength,
  remify,
} from '../../../shared/styles/css-values.js';
import type { ProgressTone } from '../progress-bar/progress-bar.js';

export type { ProgressTone } from '../progress-bar/progress-bar.js';

/**
 * `full` draws ticks with the value and unit inside the dial, for a stats
 * tile or a standby display; `bare` draws only the arc, fill, and needle, for
 * chip height, and carries the value in its accessible name and hover title.
 */
export type GaugeVariant = 'full' | 'bare';

/**
 * A consumer palette, such as dark red on black for a night display. Each
 * color is a typed `CssColor` from `uiColor()`, `colorVar()`, or
 * `fillColor()`; an omitted one keeps the tone's color.
 */
export interface GaugeColors {
  /** The unfilled arc. */
  track?: CssColor;
  /** The filled arc from zero to the value. */
  fill?: CssColor;
  /** The needle and its hub. */
  needle?: CssColor;
  /** The value, unit, and ticks of a `full` gauge. */
  text?: CssColor;
}

/**
 * Application `data-*` identity on the Gauge root, such as `data-key`; its
 * own configuration attributes stay protected.
 */
export type GaugeRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

const GAUGE_PROTECTED = new Set([
  'data-component',
  'data-tone',
  'data-variant',
  'data-pinned',
]);

export interface GaugeProps {
  /**
   * The reading, zero or more. A value above `max` pins the needle and fill
   * at the end of the scale while the text still shows the real value.
   */
  value: number;
  /** The end of the scale, such as the highest expected rate. */
  max: number;
  /** The gauge's accessible name, such as "Tokens per minute". */
  label: string;
  /**
   * The value as shown in a `full` dial and spoken, such as "1.2k"; defaults
   * to the value rounded to one decimal place.
   */
  valueText?: string;
  /** The unit under the value in a `full` dial, such as "tok/min". */
  unit?: string;
  variant?: GaugeVariant;
  tone?: ProgressTone;
  /**
   * The gauge's width as a typed `CssLength`; its height follows the dial.
   * Defaults to 88px for `full` and 40px for `bare`.
   */
  size?: CssLength;
  colors?: GaugeColors;
  id?: string;
  rootAttributes?: GaugeRootAttributes;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** The dial's center and arc radius in the 100-unit-wide viewBox. */
const CENTER = 50;
const RADIUS = 42;
/** The arc sweeps 240 degrees, clockwise from lower left to lower right. */
const SWEEP = 240;
const START = -SWEEP / 2;
const TICKS = 10;

const DEFAULT_WIDTH: Record<GaugeVariant, number> = { full: 88, bare: 40 };
/** The viewBox height: `bare` crops below the arc, `full` keeps the readout. */
const VIEW_HEIGHT: Record<GaugeVariant, number> = { full: 98, bare: 76 };

/** A point on a circle around the center, `angle` degrees clockwise from up. */
function polar(radius: number, angle: number): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [
    CENTER + radius * Math.sin(radians),
    CENTER - radius * Math.cos(radians),
  ];
}

const fixed = (n: number) => String(Number(n.toFixed(3)));

const [arcStartX, arcStartY] = polar(RADIUS, START);
const [arcEndX, arcEndY] = polar(RADIUS, START + SWEEP);
const ARC = `M ${fixed(arcStartX)} ${fixed(arcStartY)} A ${RADIUS} ${RADIUS} 0 1 1 ${fixed(arcEndX)} ${fixed(arcEndY)}`;

const TICK_LINES = Array.from({ length: TICKS + 1 }, (_, index) => {
  const angle = START + (SWEEP * index) / TICKS;
  const major = index === 0 || index === TICKS / 2 || index === TICKS;
  const [x1, y1] = polar(major ? 27 : 30, angle);
  const [x2, y2] = polar(34, angle);
  return (
    <line
      class={
        major ? 'kui-gauge__tick kui-gauge__tick--major' : 'kui-gauge__tick'
      }
      x1={fixed(x1)}
      y1={fixed(y1)}
      x2={fixed(x2)}
      y2={fixed(y2)}
    />
  );
});

function formatValue(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * A speedometer-style dial for a reading on a scale that is not progress,
 * such as a live rate: a track arc, a fill from zero to the value, and a
 * needle, scaled to `max`. `full` adds ticks and the value and unit inside
 * the dial; `bare` is the arc, fill, and needle alone, for chip height. It is
 * a `role="meter"` named by `label`, with the value and unit as
 * `aria-valuetext`. The needle and fill transition only when the value
 * changes, and hold still under reduced motion.
 */
export function Gauge({
  value,
  max,
  label,
  valueText,
  unit,
  variant = 'full',
  tone = 'brand',
  size,
  colors = {},
  id,
  rootAttributes = {},
  className = '',
  slot,
}: GaugeProps) {
  if (!Number.isFinite(max) || max <= 0)
    throw new RangeError('Gauge max must be a positive number.');
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError('Gauge value must be zero or more.');
  const shown = Math.min(value, max);
  const fraction = shown / max;
  const text = valueText ?? formatValue(value);
  const spoken = unit === undefined ? text : `${text} ${unit}`;
  const style = [
    `--_kui-gauge-size:${size ?? remify(DEFAULT_WIDTH[variant])}`,
    colors.track === undefined ? '' : `--_kui-gauge-track:${colors.track}`,
    colors.fill === undefined ? '' : `--_kui-gauge-fill:${colors.fill}`,
    colors.needle === undefined ? '' : `--_kui-gauge-needle:${colors.needle}`,
    colors.text === undefined ? '' : `--_kui-gauge-text:${colors.text}`,
  ]
    .filter(Boolean)
    .join(';');
  return (
    <span
      {...filterDataAttributes(rootAttributes, GAUGE_PROTECTED)}
      id={id}
      class={`kui-gauge ${className}`.trim()}
      data-component="gauge"
      data-tone={tone}
      data-variant={variant}
      data-pinned={value > max ? '' : undefined}
      role="meter"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax={String(max)}
      aria-valuenow={String(shown)}
      aria-valuetext={spoken}
      title={variant === 'bare' ? `${label}: ${spoken}` : undefined}
      style={style}
      slot={slot}
    >
      <svg viewBox={`0 0 100 ${VIEW_HEIGHT[variant]}`} aria-hidden="true">
        <path class="kui-gauge__track" d={ARC} pathLength={100} />
        <path
          class="kui-gauge__fill"
          d={ARC}
          pathLength={100}
          style={`stroke-dasharray:${fixed(fraction * 100)} 100`}
        />
        {variant === 'full' ? TICK_LINES : null}
        <g
          class="kui-gauge__needle"
          style={`transform:rotate(${fixed(START + SWEEP * fraction)}deg)`}
        >
          <line
            x1={String(CENTER)}
            y1={String(CENTER)}
            x2={String(CENTER)}
            y2={String(CENTER - (variant === 'full' ? 25 : 34))}
          />
          <circle cx={String(CENTER)} cy={String(CENTER)} r="5" />
        </g>
        {variant === 'full' ? (
          <text
            class="kui-gauge__value"
            x="50"
            y="83"
            text-anchor="middle"
            font-size="18"
          >
            {text}
          </text>
        ) : null}
        {variant === 'full' && unit !== undefined ? (
          <text
            class="kui-gauge__unit"
            x="50"
            y="95"
            text-anchor="middle"
            font-size="11"
          >
            {unit}
          </text>
        ) : null}
      </svg>
    </span>
  );
}

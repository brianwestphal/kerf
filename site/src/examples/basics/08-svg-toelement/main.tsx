import { signal, mount, delegate, toElement } from 'kerfjs';

const x = signal(50);

const root = document.getElementById('app')!;

mount(root, () => (
  <div>
    <input
      type="range"
      min="0"
      max="100"
      value={String(x.value)}
      data-slider
      style="width: 280px; margin-bottom: 0.5rem;"
    />
    <p style="font-family: ui-monospace, monospace;">x = {x.value}</p>
    <svg id="kerf-example-svg" viewBox="0 0 100 40" width="300" height="120" style="background: #1f2937;">
      <circle cx={String(x.value)} cy="20" r="6" fill="#f59e0b" />
    </svg>
  </div>
));

delegate(root, 'input', '[data-slider]', (_, input) => {
  x.value = Number((input as HTMLInputElement).value);
});

// The escape hatch: building an SVG fragment WITHOUT an <svg> wrapper.
const tickPath = toElement('<path d="M 0 10 L 100 10" stroke="#9ca3af" stroke-width="0.5" />');
document.getElementById('kerf-example-svg')!.prepend(tickPath);

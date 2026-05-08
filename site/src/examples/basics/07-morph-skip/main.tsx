import { signal, mount, delegate } from 'kerfjs';

const count = signal(0);

const root = document.getElementById('app')!;

mount(root, () => (
  <div>
    <p style="margin: 0 0 0.5rem;">Re-renders: {count.value}</p>
    <button data-action="inc" style="margin-bottom: 0.75rem;">Re-render</button>
    {/* The canvas is library-owned. Mark it skip and mount imperatively. */}
    <div id="chart-host" data-morph-skip>
      <canvas id="kerf-example-chart" width="200" height="80" style="display: block;"></canvas>
    </div>
  </div>
));

const ctx = (document.getElementById('kerf-example-chart') as HTMLCanvasElement).getContext('2d')!;
let frame = 0;
function tick() {
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, 200, 80);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect((frame * 5) % 200, 40 + Math.sin(frame / 10) * 20, 4, 4);
  frame += 1;
  requestAnimationFrame(tick);
}
tick();

delegate(root, 'click', '[data-action="inc"]', () => { count.value += 1; });

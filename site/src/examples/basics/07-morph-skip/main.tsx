import { signal, mount, delegate } from 'kerfjs';

const count = signal(0);

const root = document.getElementById('app')!;

mount(root, () => (
  <div class="kerf-stack" style="max-width: 24rem;">
    <div class="kerf-toolbar" style="justify-content: space-between;">
      <button data-action="inc">Force re-render</button>
      <span class="kerf-helper-text">
        Re-renders: <strong class="kerf-mono">{count.value}</strong>
      </span>
    </div>
    {/* The canvas is library-owned. Mark it skip and mount imperatively. */}
    <div id="chart-host" data-morph-skip style="border-radius: 4px; overflow: hidden;">
      <canvas id="kerf-example-chart" width="320" height="80" style="display: block;"></canvas>
    </div>
    <p class="kerf-helper-text">
      The canvas keeps animating no matter how often the surrounding tree re-renders, because <code class="kerf-mono">data-morph-skip</code> tells the diff to leave it alone.
    </p>
  </div>
));

const canvas = document.getElementById('kerf-example-chart') as HTMLCanvasElement;
canvas.width = 320;
const ctx = canvas.getContext('2d')!;
let frame = 0;
function tick() {
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, 320, 80);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect((frame * 5) % 320, 40 + Math.sin(frame / 10) * 20, 4, 4);
  frame += 1;
  requestAnimationFrame(tick);
}
tick();

delegate(root, 'click', '[data-action="inc"]', () => { count.value += 1; });

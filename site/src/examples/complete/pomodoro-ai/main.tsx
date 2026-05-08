// AI-generated Pomodoro for kerf.
// See site/src/content/docs/examples/complete/built-by-an-ai.md for the prompt
// and provenance notes. This file is the produced code, lightly edited only
// where flagged in that doc.

import { signal, computed, mount, effect, delegate } from 'kerfjs';

type Mode = 'focus' | 'break';
const FOCUS_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;

const mode      = signal<Mode>('focus');
const remaining = signal(FOCUS_SECS);
const running   = signal(false);
const completed = signal(0);

const display = computed(() => {
  const m = (remaining.value / 60) | 0;
  const s = remaining.value % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

// Tick effect: when running, decrement once per second.
effect(() => {
  if (!running.value) return;
  const id = setInterval(() => {
    if (remaining.value <= 1) {
      // Phase transition.
      if (mode.value === 'focus') {
        completed.value = completed.value + 1;
        mode.value = 'break';
        remaining.value = BREAK_SECS;
      } else {
        mode.value = 'focus';
        remaining.value = FOCUS_SECS;
      }
    } else {
      remaining.value = remaining.value - 1;
    }
  }, 1000);
  return () => clearInterval(id);
});

const root = document.getElementById('app')!;

mount(root, () => (
  <div class={`pom ${mode.value}`}>
    <div class="mode">{mode.value === 'focus' ? 'Focus' : 'Break'}</div>
    <div class="time">{display.value}</div>
    <div class="controls">
      <button data-action="toggle">{running.value ? 'Pause' : 'Start'}</button>
      <button data-action="reset">Reset</button>
    </div>
    <div class="completed">🍅 × {completed.value}</div>
  </div>
));

delegate(root, 'click', '[data-action="toggle"]', () => { running.value = !running.value; });
delegate(root, 'click', '[data-action="reset"]', () => {
  running.value = false;
  mode.value = 'focus';
  remaining.value = FOCUS_SECS;
});

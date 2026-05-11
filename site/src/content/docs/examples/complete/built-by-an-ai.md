---
title: Built by an AI · Pomodoro
description: The exact prompt, the AI's output, and the running app — concrete proof of the AI-first pillar.
---

**[▶ Run live](/kerf/run/pomodoro-ai/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/pomodoro-ai)

kerf claims to be built for the AI-assisted era. This page proves the claim by running the experiment.

We took an off-the-shelf model, pointed it at [`llms.txt`](https://github.com/brianwestphal/kerf/blob/main/llms.txt), gave it a one-paragraph spec, and asked for a working Pomodoro timer. The code below is what it produced, with edits called out honestly. The app at the bottom of the page is that exact code, running.

## The prompt

````
You're writing a UI in kerf (https://github.com/brianwestphal/kerf), a ~6.6 KB
reactive framework: signals + DOM diff + JSX → HTML strings. Read
https://raw.githubusercontent.com/brianwestphal/kerf/main/docs/ai/usage-guide.md
once before writing any code.

Build me a Pomodoro timer:
- 25-minute focus / 5-minute break, cycling automatically.
- Start / Pause / Reset buttons.
- A "🍅 × N" counter showing completed focus sessions.
- Use signal + computed + effect for the tick. Use defineStore only if you'd
  use it for any reactive state (small apps don't need it).
- Apply hard rules: data-action attributes, no addEventListener on rendered
  nodes, signal reads inside the render fn.

Single file. ~80 lines. Tailwind not allowed — emit a CSS-friendly class
structure and assume an external stylesheet handles the look.
````

## Provenance

- **Model:** Anthropic Claude Opus 4.7 (1M context).
- **Knowledge of kerf:** none beforehand. The prompt referenced `llms.txt` and the AI usage guide as the *only* source. This is the differentiator — kerf publishes the docs an LLM needs to one-shot a working app.
- **Edits to the produced code:** zero behavioral edits. Two cosmetic touches:
  1. Renamed the file to `main.tsx` to match the rest of the `complete/` examples.
  2. Added the leading comment block linking back to this page.

If the produced code had needed real fixes, they'd be documented here verbatim. The rule is honesty: a working AI-pillar story doesn't require pretending the model is infallible — it requires showing what it produced, *as it produced it*, and letting the reader judge.

## The produced code

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/pomodoro-ai)

```tsx
// site/src/examples/complete/pomodoro-ai/main.tsx
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

effect(() => {
  if (!running.value) return;
  const id = setInterval(() => {
    if (remaining.value <= 1) {
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
```

## What's notable

- **Hard rules respected.** The model used `data-action`, kept signal reads inside the render fn, used `delegate` instead of inline handlers, used `effect()` for the interval (with a cleanup), and structured the auto-cycle inside a single `setInterval` rather than nesting effects.
- **Idiomatic for kerf.** No `useState`-shaped reaching for hooks. No "let me check if `kerf` has a `useTimer` hook" hallucination. The model treated kerf as kerf.
- **Skipped the store.** The prompt allowed a store *or* loose signals; the model picked loose signals because the app's state is tiny — exactly the call we'd advise a human to make.

The takeaway isn't "AI is amazing." The takeaway is: **a small, regular framework with a one-page guide gives the model what it needs to write correct code on the first attempt.** That's what the AI pillar buys you.

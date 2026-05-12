---
title: Live Markdown editor
description: Split-pane editor — contenteditable on the left, sanitized HTML preview on the right.
---

**[▶ Run live](/kerf/run/markdown-editor/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/markdown-editor)

A live Markdown editor. ~30 lines of kerf, plus `marked` for parsing and `DOMPurify` for sanitization.

**Try typing fast — your cursor stays where you put it. That's the morph at work.**

<div class="video-placeholder">
  🎬 <strong>Demo clip — Coming Soon</strong>
  <p>30-second screen-record showing focus survival while typing into the middle of a paragraph.</p>
</div>

**What to look at:**

- The editor pane is a `contenteditable`. While focused, kerf preserves caret + multi-range selection automatically. The wrapper is also marked `data-morph-skip` for explicit, unconditional protection — the diff never recurses inside.
- `computed(() => DOMPurify.sanitize(marked.parse(source.value)))` is **memoized**. Toggle the source and the parse + sanitize pair runs exactly once, not once per consumer.
- `raw(html.value)` injects the cleaned HTML verbatim. No further escaping. Crucially: `raw()` is the contract that says *"trust this string"* — DOMPurify is what makes the contract honest.
- One `delegate('input', '.editor-input', …)` syncs typing back into the source signal. State flows in one direction (DOM → signal); the morph never writes the editor's content back.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/markdown-editor)

```tsx
// site/src/examples/complete/markdown-editor/main.tsx
import { signal, computed, mount, raw, delegate } from 'kerfjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const source = signal('# Try typing fast\n\nThe cursor stays where you put it.');

const html = computed(() =>
  DOMPurify.sanitize(marked.parse(source.value, { async: false }) as string),
);

const root = document.getElementById('app')!;

mount(root, () => (
  <div class="editor">
    <div class="pane editor-pane" data-morph-skip>
      <div class="editor-input" contenteditable="plaintext-only" spellcheck="false">
        {source.value}
      </div>
    </div>
    <article class="pane preview">{raw(html.value)}</article>
  </div>
));

delegate(root, 'input', '.editor-input', (_e, el) => {
  source.value = (el as HTMLElement).innerText;
});
```

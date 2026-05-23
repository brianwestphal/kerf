import { signal, computed, mount, raw, delegate } from 'kerfjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const SAMPLE = `# Type fast. The cursor stays put.

This is the live preview on the right. The editor on the left is a
\`contenteditable\` — kerf preserves your caret and selection on every
re-render, so you can edit in the *middle* of a line and never
get bumped to the end.

## Try it

- Drop your cursor anywhere in this paragraph and keep typing — nothing jumps.
- Select a phrase, hit delete, watch only that span disappear in the preview.
- The whole reactive loop is \`signal\` → \`computed\` → \`raw()\` → morph.

## Code

\`\`\`js
const html = computed(() =>
  DOMPurify.sanitize(marked.parse(source.value)),
);
\`\`\`

> kerf does no virtual DOM. It diffs the live tree directly.
> Focused inputs and \`contenteditable\` regions are protected
> automatically.

[Read the docs →](https://brianwestphal.github.io/kerf/)
`;

const source = signal(SAMPLE);

// computed → memoized. Re-renders only when source changes.
const html = computed(() => DOMPurify.sanitize(marked.parse(source.value, { async: false }) as string));

const root = document.getElementById('app')!;

mount(root, () => (
  <div class="editor">
    <div class="pane editor-pane" data-morph-skip>
      {/*
        contenteditable is auto-skipped while focused (kerf preserves caret + selection),
        but data-morph-skip on the wrapper makes the protection unconditional. Edits flow
        OUT to the source signal via the input handler; nothing flows back IN, so we never
        fight the user.
      */}
      <div
        class="editor-input"
        contenteditable="plaintext-only"
        spellcheck="false"
      >{source.value}</div>
    </div>
    <article class="pane preview">
      {raw(html.value)}
    </article>
  </div>
));

// Page-lifetime registration: `root` is the markdown-editor mount root,
// attached once at module load and never torn down. The leading `void` is the
// explicit-discard sigil for `kerfjs/require-delegate-disposer` — it signals
// "I know this is page-lifetime and intentionally discarded the disposer."
// For transient roots (modals, route views, mount swaps) capture and call the
// disposer — see docs/5-event-delegation.md §5.3.
//
// Tier 1: input bubbles. Sync from contenteditable into the source signal.
void delegate(root, 'input', '.editor-input', (_e, el) => {
  source.value = (el as HTMLElement).innerText;
});

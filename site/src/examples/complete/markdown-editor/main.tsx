import { signal, computed, mount, raw, delegate } from 'kerfjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const SAMPLE = `# Try typing fast

The cursor stays where you put it. That's the morph at work.

Hit \`Cmd+B\` and watch nothing break. **Bold**, *italic*, ~~strike~~, \`code\`, lists, links — they all just work.

- Item one
- Item two
  - Nested
- [A link](https://github.com/brianwestphal/kerf)
`;

const source = signal(SAMPLE);

// computed → memoised. Re-renders only when source changes.
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

// Tier 1: input bubbles. Sync from contenteditable into the source signal.
delegate(root, 'input', '.editor-input', (_e, el) => {
  source.value = (el as HTMLElement).innerText;
});

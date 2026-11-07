import { signal, mount, raw, delegate } from 'kerfjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const source = signal(`# Hello\n\nType **bold** and *italic*.`);

function render(md: string) {
  const html = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(html);
}

const root = document.getElementById('app')!;

mount(root, () => (
  <div class="kerf-stack">
    <div class="kerf-split-md">
      <div>
        <p class="kerf-section-label">Markdown</p>
        <textarea
          data-source
          class="kerf-mono"
          rows={12}
          style="resize: vertical;"
        >
          {source.value}
        </textarea>
      </div>
      <div>
        <p class="kerf-section-label">Rendered</p>
        <article class="kerf-output" style="overflow: auto;">
          {/* eslint-disable-next-line kerfjs/no-raw-with-dynamic-arg -- render() sanitizes with DOMPurify */}
          {raw(render(source.value))}
        </article>
      </div>
    </div>
  </div>
));

// The demo root lives as long as the page, so each delegate() is
// page-lifetime and its disposer is deliberately discarded with `void`.
void delegate(root, 'input', '[data-source]', (_, ta) => {
  source.value = (ta as HTMLTextAreaElement).value;
});

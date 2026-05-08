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
        >{source.value}</textarea>
      </div>
      <div>
        <p class="kerf-section-label">Rendered</p>
        <article class="kerf-output" style="overflow: auto;">
          {raw(render(source.value))}
        </article>
      </div>
    </div>
  </div>
));

delegate(root, 'input', '[data-source]', (_, ta) => {
  source.value = (ta as HTMLTextAreaElement).value;
});

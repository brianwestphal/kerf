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
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; min-height: 200px;">
    <textarea data-source rows={12} style="font-family: ui-monospace, monospace; font-size: 0.85rem; padding: 0.5rem;">{source.value}</textarea>
    <article style="padding: 0.5rem; background: var(--sl-color-bg); color: var(--sl-color-text); border: 1px solid var(--sl-color-gray-5); border-radius: 4px; overflow: auto;">
      {raw(render(source.value))}
    </article>
  </div>
));

delegate(root, 'input', '[data-source]', (_, ta) => {
  source.value = (ta as HTMLTextAreaElement).value;
});

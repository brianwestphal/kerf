import { signal, mount, delegate } from 'kerfjs';

const log = signal<string[]>([]);

function addLog(msg: string) {
  log.value = [...log.value, `${new Date().toLocaleTimeString()} — ${msg}`];
}

const root = document.getElementById('app')!;

mount(root, () => (
  <div class="kerf-stack">
    <p class="kerf-helper-text">
      A pretend toolbar. Each click is logged below — nothing persists or leaves the page.
    </p>
    <nav class="kerf-toolbar">
      <button type="button" data-action="save">Save</button>
      <button type="button" data-action="copy">Copy</button>
      <button type="button" data-action="delete">Delete</button>
    </nav>
    <div>
      <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;">
        <p class="kerf-section-label">Last 5 clicks</p>
        <button
          class="kerf-link-button"
          type="button"
          data-action="clear-log"
        >
          Clear log
        </button>
      </div>
      <ul class="kerf-output kerf-mono" style="list-style: none; padding-left: 1rem; min-height: 7em;">
        {log.value.slice(-5).map((line, i) => (
          <li data-key={i}>{line}</li>
        ))}
      </ul>
    </div>
  </div>
));

delegate(root, 'click', '[data-action]', (_e, btn) => {
  const action = (btn as HTMLElement).dataset.action!;
  if (action === 'clear-log') {
    log.value = [];
  } else {
    addLog(`${action} clicked`);
  }
});

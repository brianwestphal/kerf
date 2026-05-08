import { signal, mount, delegate } from 'kerfjs';

const log = signal<string[]>([]);

function addLog(msg: string) {
  log.value = [...log.value, `${new Date().toLocaleTimeString()} — ${msg}`];
}

const root = document.getElementById('app')!;

mount(root, () => (
  <div>
    <p style="margin: 0 0 0.5rem; font-size: 0.85rem; opacity: 0.8;">
      A pretend toolbar. Each click is logged below — nothing persists or leaves the page.
    </p>
    <nav style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
      <button data-action="save">Save</button>
      <button data-action="copy">Copy</button>
      <button data-action="delete">Delete</button>
      <button data-action="clear-log">Clear log</button>
    </nav>
    <p style="margin: 0 0 0.25rem; font-size: 0.85rem; font-weight: 600;">Last 5 clicks</p>
    <ul style="font-family: ui-monospace, monospace; font-size: 0.85rem; padding-left: 1rem; min-height: 6em; margin: 0;">
      {log.value.slice(-5).map((line, i) => (
        <li data-key={i}>{line}</li>
      ))}
    </ul>
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

import '@kerfjs/ui/layout.css';

import { delegate, mount, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';

export interface AppCommand {
  id: string;
  label: string;
  keywords?: string[];
}

export interface CommandPaletteCallbacks {
  onClose(): void;
  onRun(command: AppCommand): void;
}

/**
 * Application-local example, not an @kerfjs/ui export. The application owns
 * ranking, history, shortcuts, focus policy, command availability, and copy.
 */
export function mountCommandPaletteAdapter(
  root: HTMLElement,
  commands: AppCommand[],
  { onClose, onRun }: CommandPaletteCallbacks,
): () => void {
  const query = signal('');
  const render = () => {
    const needle = query.value.trim().toLocaleLowerCase();
    const matches = commands.filter((command) => !needle ||
      [command.label, ...(command.keywords ?? [])].some((value) => value.toLocaleLowerCase().includes(needle)));
    return <section class="app-command-palette kui-content" aria-label="Command palette">
      <div class="kui-content-item"><label for="app-command-query">Search commands</label><input id="app-command-query" type="search" value={query.value} autocomplete="off" data-command-query /></div>
      <p class="kui-content-item" aria-live="polite">{matches.length} matching commands</p>
      <ul class="kui-content-item" aria-label="Matching commands">{matches.map((command) => <li><button type="button" data-action="run-command" data-command-id={command.id}>{command.label}</button></li>)}</ul>
      <footer class="kui-control-cluster kui-content-item" aria-label="Command palette actions">
        <button type="button" data-action="clear-query">Clear search</button>
        <button type="button" data-action="close-palette">Close</button>
      </footer>
    </section>;
  };

  const stopMount = mount(root, render);
  const stopActions = delegateActions(root, 'click', {
    'run-command': (_event, element) => {
      const id = (element as HTMLElement).dataset.commandId;
      const command = commands.find((candidate) => candidate.id === id);
      if (command) onRun(command);
    },
    'clear-query': () => {
      query.value = '';
      root.querySelector<HTMLInputElement>('[data-command-query]')?.focus();
    },
    'close-palette': onClose,
  });
  const stopInput = delegate<HTMLInputElement>(root, 'input', '[data-command-query]', (_event, input) => {
    query.value = input.value;
  });
  const stopEscape = delegate(root, 'keydown', '[data-command-query]', (event) => {
    if ((event as KeyboardEvent).key === 'Escape') onClose();
  });
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    stopEscape();
    stopInput();
    stopActions();
    stopMount();
  };
}

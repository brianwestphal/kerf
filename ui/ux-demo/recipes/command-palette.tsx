import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';
import './recipes.css';

import { DialogHeader } from '@kerfjs/ui/dialog-header';
import type {} from '@kerfjs/ui/webawesome';
import { signal } from 'kerfjs';

import type { RecipeFactory } from './types.js';

interface Command {
  id: string;
  label: string;
  group: string;
  keywords: readonly string[];
}

interface RecipeDialogElement extends HTMLElement {
  open: boolean;
}

const commands: readonly Command[] = [
  { id: 'create-project', label: 'Create project', group: 'Projects', keywords: ['new', 'workspace'] },
  { id: 'open-settings', label: 'Open workspace settings', group: 'Projects', keywords: ['preferences'] },
  { id: 'go-inbox', label: 'Go to inbox', group: 'Navigation', keywords: ['messages'] },
  { id: 'show-shortcuts', label: 'Show keyboard shortcuts', group: 'Help', keywords: ['keys', 'help'] },
];

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export const createRecipe: RecipeFactory = (announce) => {
  const query = signal('');
  const active = signal(0);
  const recent = signal<readonly string[]>(['go-inbox']);
  const open = signal(false);
  let invoker: HTMLElement | null = null;

  const matchingCommands = () => {
    const needle = normalize(query.value);
    return commands.filter((command) => !needle || [command.label, ...command.keywords].some((value) => normalize(value).includes(needle)));
  };
  const groupedCommands = () => {
    const matches = matchingCommands();
    const recentCommands = query.value.trim() ? [] : recent.value.map((id) => matches.find((command) => command.id === id)).filter((command): command is Command => Boolean(command));
    const recentIds = new Set(recentCommands.map(({ id }) => id));
    const remaining = matches.filter(({ id }) => !recentIds.has(id));
    const groups = [...new Set(remaining.map(({ group }) => group))].map((group) => ({ group, commands: remaining.filter((command) => command.group === group) }));
    return recentCommands.length ? [{ group: 'Recent commands', commands: recentCommands }, ...groups] : groups;
  };
  const results = () => groupedCommands().flatMap((group) => group.commands);
  const selectedIndex = () => Math.min(active.value, Math.max(0, results().length - 1));
  const recipeRoot = (element: HTMLElement) => element.closest<HTMLElement>('[data-recipe="recipe-command-palette"]');
  const dialog = (element: HTMLElement) => recipeRoot(element)?.querySelector<RecipeDialogElement>('wa-dialog');
  const focusSearch = (element: HTMLElement) => globalThis.queueMicrotask(() => recipeRoot(element)?.querySelector<HTMLInputElement>('[data-command-query]')?.focus());

  const run = (command: Command, element: HTMLElement) => {
    recent.value = [command.id, ...recent.value.filter((id) => id !== command.id)].slice(0, 6);
    announce(`Ran ${command.label}`);
    const modal = dialog(element);
    if (modal) modal.open = false;
  };

  const render = () => {
    const groups = groupedCommands();
    const flat = groups.flatMap((group) => group.commands);
    const selected = selectedIndex();
    let index = -1;
    return <section class="kui-recipe recipe-command-palette kui-content" data-recipe="recipe-command-palette">
      <button class="kui-recipe__button kui-content-item" data-primary="true" type="button" data-action="recipe-action" data-recipe-command="open">Try command palette</button>
      <p class="kui-recipe__ownership kui-content-item">Find workspace-wide actions without leaving this task. Copyable recipe; not an @kerfjs/ui runtime export. Your app owns commands, ranking, permissions, history, shortcuts, and dispatch.</p>
      <wa-dialog class="recipe-command-palette__dialog" label="Command palette" without-header open={open.value}>
        <DialogHeader title="Command palette" titleId="recipe-command-title" summary="Run workspace actions without leaving this task. Copyable recipe; not an @kerfjs/ui runtime export." summaryId="recipe-command-summary" actions={<button class="kui-recipe__button" type="button" data-action="recipe-action" data-recipe-command="close">Close</button>} />
        <div class="recipe-command-palette__body kui-content">
          <label for="recipe-command-query">Search actions</label>
          <input id="recipe-command-query" class="recipe-command-palette__search" type="search" value={query.value} autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="recipe-command-results" aria-activedescendant={flat.length ? `recipe-command-option-${selected}` : undefined} aria-describedby="recipe-command-help" data-command-query data-recipe-input data-recipe-keydown />
          {flat.length ? <div id="recipe-command-results" class="recipe-command-palette__results" role="listbox" aria-label="Commands">
            {groups.map(({ group, commands: groupCommands }, groupIndex) => <section class="recipe-command-palette__group" role="group" aria-labelledby={`recipe-command-group-${groupIndex}`}>
              <h3 id={`recipe-command-group-${groupIndex}`} class="recipe-command-palette__group-title">{group}</h3>
              {groupCommands.map((command) => {
                index += 1;
                return <div id={`recipe-command-option-${index}`} class="recipe-command-palette__option" role="option" aria-selected={String(index === selected)} data-action="recipe-action" data-recipe-command="run" data-command-id={command.id}>{command.label}</div>;
              })}
            </section>)}
          </div> : <div id="recipe-command-results" class="recipe-command-palette__empty" role="status"><strong>No matching commands</strong><span>Try another word or phrase.</span></div>}
          <footer class="kui-metadata-row"><p class="recipe-command-palette__status" role="status">{flat.length} matches</p><p id="recipe-command-help" class="recipe-command-palette__help">Arrow keys move · Enter runs · Escape closes</p></footer>
        </div>
      </wa-dialog>
    </section>;
  };

  return {
    render,
    action(command, element) {
      if (command === 'open') {
        invoker = element;
        query.value = '';
        active.value = 0;
        open.value = true;
        const modal = dialog(element);
        if (modal) modal.open = true;
        return;
      }
      if (command === 'close') {
        const modal = dialog(element);
        if (modal) modal.open = false;
        return;
      }
      if (command === 'run') {
        const selected = commands.find(({ id }) => id === element.dataset.commandId);
        if (selected) run(selected, element);
      }
    },
    change(element) {
      query.value = (element as HTMLInputElement).value;
      active.value = 0;
      focusSearch(element);
    },
    keydown(event, element) {
      if (event.isComposing) return;
      const matches = results();
      const current = selectedIndex();
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        if (!matches.length) return;
        active.value = event.key === 'Home' ? 0 : event.key === 'End' ? matches.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
        focusSearch(element);
      } else if (event.key === 'Enter' && matches[current]) {
        event.preventDefault();
        run(matches[current], element);
      }
    },
    afterShow(element) {
      focusSearch(element);
    },
    afterHide() {
      open.value = false;
      query.value = '';
      active.value = 0;
      if (invoker?.isConnected) invoker.focus();
    },
  };
};

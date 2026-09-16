import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';
import './recipes.css';

import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PanelHeader } from '@kerfjs/ui/panel-header';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { FileText } from 'lucide';

import type { RecipeFactory } from './types.js';

const records = {
  alpha: { name: 'Northstar migration', owner: 'Mara Chen', state: 'In review', updated: 'Today, 09:42' },
  beta: { name: 'Tablet navigation', owner: 'Sam Rivera', state: 'Ready', updated: 'Yesterday, 16:20' },
  gamma: { name: 'Contrast audit', owner: 'Inez Okafor', state: 'Blocked', updated: 'Monday, 11:05' },
} as const;

interface RecipeDialogElement extends HTMLElement {
  open: boolean;
}

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal<keyof typeof records>('alpha');
  const open = { value: false };
  const render = () => <section class="kui-recipe kui-content" data-recipe="recipe-master-detail-dialog"><button class="kui-recipe__button kui-content-item" data-primary="true" type="button" data-action="recipe-action" data-recipe-command="open">Open project details</button><p class="kui-recipe__ownership kui-content-item">Web Awesome owns modal focus and dismissal. The recipe owns header/body/master-detail anatomy; the app owns open state, selection, and policy.</p><wa-dialog class="recipe-dialog" label="Project details" without-header open={open.value}><div class="recipe-dialog__pane kui-pane"><div class="recipe-master-detail kui-pane__content"><nav class="recipe-master-detail__master kui-pane" aria-label="Projects"><ListHeader label="Recent projects" /><div class="kui-pane__content kui-content"><section>{Object.entries(records).map(([id, record]) => <ListItem action="recipe-action" itemId={id} label={record.name} selected={selected.value === id} multiline />)}</section></div></nav><section class="recipe-master-detail__detail kui-pane"><PanelHeader title="Project details" titleId="recipe-dialog-title" summary="Compare delivery state without leaving the workspace." summaryId="recipe-dialog-summary" icon={<LucideIcon icon={FileText} name="file-text" />} actions={<wa-button appearance="plain" data-action="recipe-action" data-recipe-command="close">Close</wa-button>} /><div class="recipe-master-detail__body kui-pane__content kui-content" aria-live="polite"><h3 class="recipe-master-detail__title kui-recipe__pane-title kui-content-item">{records[selected.value].name}</h3><ValueTable label="Project details"><ValueTableRow label="Owner" value={records[selected.value].owner} /><ValueTableRow label="Status" value={records[selected.value].state} /><ValueTableRow label="Updated" value={records[selected.value].updated} /></ValueTable><div class="recipe-master-detail__actions kui-control-cluster"><wa-button appearance="outlined" data-action="recipe-action" data-recipe-command="archive">Archive</wa-button><wa-button variant="brand" appearance="accent" data-action="recipe-action" data-recipe-command="open-record">Open project</wa-button></div></div></section></div></div></wa-dialog></section>;
  return {
    render,
    action(command, element) {
      const id = element.dataset.itemId;
      if (id && id in records) { selected.value = id as keyof typeof records; announce(`Selected ${records[selected.value].name}`); return; }
      const dialog = element.closest('[data-recipe]')?.querySelector<RecipeDialogElement>('wa-dialog');
      if (command === 'open' && dialog) { element.focus(); open.value = true; dialog.open = true; return; }
      if (command === 'close' && dialog) { dialog.open = false; return; }
      announce(`${command} requested`);
    },
    afterHide() {
      open.value = false;
    },
  };
};

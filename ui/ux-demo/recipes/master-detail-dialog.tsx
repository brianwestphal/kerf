import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/sidebar.css';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';
import './recipes.css';

import { DialogHeader } from '@kerfjs/ui/dialog-header';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { MenuHeader } from '@kerfjs/ui/menu-header';
import { MenuItem } from '@kerfjs/ui/menu-item';
import { ValueTable } from '@kerfjs/ui/value-table';
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
  const render = () => <section class="kui-recipe kui-section-stack" data-recipe="recipe-master-detail-dialog"><button class="kui-recipe__button" data-primary="true" type="button" data-action="recipe-action" data-recipe-command="open">Open project details</button><p class="kui-recipe__ownership">Web Awesome owns modal focus and dismissal. The recipe owns header/body/master-detail anatomy; the app owns open state, selection, and policy.</p><wa-dialog class="recipe-dialog" label="Project details" without-header open={open.value}><DialogHeader title="Project details" titleId="recipe-dialog-title" summary="Compare delivery state without leaving the workspace." summaryId="recipe-dialog-summary" icon={<LucideIcon icon={FileText} name="file-text" />} actions={<wa-button appearance="plain" data-action="recipe-action" data-recipe-command="close">Close</wa-button>} /><div class="recipe-master-detail kui-dialog-body"><nav class="recipe-master-detail__master kui-sidebar kui-pane-body" aria-label="Projects"><MenuHeader label="Recent projects" />{Object.entries(records).map(([id, record]) => <MenuItem action="recipe-action" itemId={id} label={record.name} selected={selected.value === id} multiline />)}</nav><section class="recipe-master-detail__detail kui-pane-body kui-section-stack" aria-live="polite"><h3 class="kui-recipe__pane-title">{records[selected.value].name}</h3><ValueTable label="Project details"><div><dt>Owner</dt><dd>{records[selected.value].owner}</dd></div><div><dt>Status</dt><dd>{records[selected.value].state}</dd></div><div><dt>Updated</dt><dd>{records[selected.value].updated}</dd></div></ValueTable><div class="kui-control-cluster"><wa-button appearance="outlined" data-action="recipe-action" data-recipe-command="archive">Archive</wa-button><wa-button variant="brand" appearance="accent" data-action="recipe-action" data-recipe-command="open-record">Open project</wa-button></div></section></div></wa-dialog></section>;
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

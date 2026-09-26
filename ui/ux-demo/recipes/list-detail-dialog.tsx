import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/split-view.css';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';

import { deviceClass } from '@kerfjs/ui/device-class';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { SplitView } from '@kerfjs/ui/split-view';
import { DialogSurface } from '@kerfjs/ui/surface-scaffold';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { ChevronRight, FileText } from 'lucide';

import type { RecipeFactory, RecipePresentation } from './types.js';

const records = {
  alpha: {
    name: 'Northstar migration',
    owner: 'Mara Chen',
    state: 'In review',
    updated: 'Today, 09:42',
  },
  beta: {
    name: 'Tablet navigation',
    owner: 'Sam Rivera',
    state: 'Ready',
    updated: 'Yesterday, 16:20',
  },
  gamma: {
    name: 'Contrast audit',
    owner: 'Inez Okafor',
    state: 'Blocked',
    updated: 'Monday, 11:05',
  },
} as const;

type RecordId = keyof typeof records;

interface RecipeDialogElement extends HTMLElement {
  open: boolean;
}

export const presentation: RecipePresentation = {
  viewport: { layout: 'grid', width: 'full' },
  note: 'Web Awesome owns modal focus, Escape, and the close control; DialogSurface owns dialog geometry; SplitView owns the list-detail panes and their compact drill-down. The app owns open state, selection, and record actions.',
};

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal<RecordId>('alpha');
  // Compact devices drill from the list into the detail; this flag is the
  // pushed detail view. Roomy devices show both panes side by side.
  const detailOpen = signal(false);
  const open = { value: false };
  const device = deviceClass();

  const projectList = (compact: boolean) => (
    <List>
      {compact ? null : <ListHeader label="Recent projects" />}
      <section aria-label="Projects">
        {Object.entries(records).map(([id, record]) => (
          <ListItem
            action="recipe-action"
            itemId={id}
            label={record.name}
            description={`${record.owner} · ${record.state}`}
            icon={<LucideIcon icon={FileText} name="file-text" />}
            trailing={
              compact ? (
                <LucideIcon icon={ChevronRight} name="chevron-right" />
              ) : undefined
            }
            selected={!compact && selected.value === id}
            multiline
          />
        ))}
      </section>
    </List>
  );

  const projectDetail = (compact: boolean) => {
    const record = records[selected.value];
    return (
      <List>
        {compact ? null : <ListHeader label={record.name} />}
        <ValueTable label="Project details">
          <ValueTableRow label="Owner" value={record.owner} />
          <ValueTableRow label="Status" value={record.state} />
          <ValueTableRow label="Updated" value={record.updated} />
        </ValueTable>
      </List>
    );
  };

  const render = () => {
    const compact = device.value.compact;
    return (
      <section
        data-recipe="recipe-list-detail-dialog"
        aria-label="Project details dialog"
      >
        <Row hAlign="center">
          <DialogSurface
            size="large"
            presentation={compact ? 'fullscreen' : 'modal'}
            bodyInset="none"
            footerInset="comfortable"
          >
            <wa-button
              variant="brand"
              appearance="accent"
              data-action="recipe-action"
              data-recipe-command="open"
            >
              Open project details
            </wa-button>
            <wa-dialog label="Project details" open={open.value} with-footer>
              <SplitView
                id="recipe-projects"
                label="Projects"
                compact={compact}
                detailActive={compact && detailOpen.value}
                listTitle="Recent projects"
                detailTitle={records[selected.value].name}
                backLabel="Back to projects"
                list={projectList(compact)}
                detail={projectDetail(compact)}
              />
              <wa-button
                slot="footer"
                appearance="outlined"
                data-action="recipe-action"
                data-recipe-command="archive"
              >
                Archive
              </wa-button>
              <wa-button
                slot="footer"
                variant="brand"
                appearance="accent"
                data-action="recipe-action"
                data-recipe-command="open-record"
              >
                Open project
              </wa-button>
            </wa-dialog>
          </DialogSurface>
        </Row>
      </section>
    );
  };
  return {
    render,
    action(command, element) {
      if (command === 'nav-back') {
        detailOpen.value = false;
        announce('Back to projects');
        return;
      }
      const id = element.dataset.itemId;
      if (id && id in records) {
        selected.value = id as RecordId;
        detailOpen.value = true;
        announce(`Selected ${records[selected.value].name}`);
        return;
      }
      const dialog = element
        .closest('[data-recipe]')
        ?.querySelector<RecipeDialogElement>('wa-dialog');
      if (command === 'open' && dialog) {
        element.focus();
        open.value = true;
        dialog.open = true;
        return;
      }
      announce(`${command} requested`);
    },
    afterHide() {
      open.value = false;
      detailOpen.value = false;
    },
  };
};

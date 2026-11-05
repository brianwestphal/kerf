import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PagedView, type PagedViewPage } from '@kerfjs/ui/paged-view';
import { Text } from '@kerfjs/ui/text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { wirePagedViews } from '@kerfjs/ui/wire-paged-views';
import { signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { Folder } from 'lucide';

const OPEN_PROJECT = 'paged-view-demo-open-project';

const PROJECTS = [
  { id: 'kerf', label: 'Kerf', open: 4 },
  { id: 'hot-sheet', label: 'Hot Sheet', open: 2 },
  { id: 'site', label: 'Documentation Site', open: 1 },
  { id: 'api', label: 'Internal API', open: 6 },
  { id: 'design', label: 'Design System', open: 3 },
  { id: 'mobile', label: 'Mobile App', open: 2 },
  { id: 'archive', label: 'Legacy Archive', open: 0 },
] as const;

/** Each demo view's current page, keyed by its PagedView id. */
const INITIAL_PAGES: Record<string, string> = {
  'paged-view-demo-three': 'today',
  'paged-view-demo-two': 'today',
  'paged-view-demo-sidebar': 'today',
};
const pages = signal<Record<string, string>>({ ...INITIAL_PAGES });
const openProject = signal('kerf');

export function resetPagedViewDemo(): void {
  pages.value = { ...INITIAL_PAGES };
  openProject.value = 'kerf';
}

/** Follows each view's page and opens the chosen triage project. */
export function wirePagedViewDemo(canvas: HTMLElement): () => void {
  const stopPages = wirePagedViews(canvas, {
    onPageChange: (page, view) => {
      pages.value = { ...pages.value, [view]: page };
    },
  });
  const stopActions = delegateActions<HTMLElement>(canvas, 'click', {
    [OPEN_PROJECT]: (_event, row) => {
      openProject.value = row.dataset.itemId ?? 'kerf';
    },
  });
  return () => {
    stopPages();
    stopActions();
  };
}

function todayPage(): PagedViewPage {
  return {
    id: 'today',
    label: 'Today',
    content: (
      <>
        <ListHeader label="Completed Today" />
        <ValueTable label="Completed Today">
          <ValueTableRow label="Tickets" value="7" />
          <ValueTableRow label="Reviews" value="3" />
          <ValueTableRow label="Releases" value="1" />
        </ValueTable>
      </>
    ),
  };
}

function tokenRatePage(): PagedViewPage {
  return {
    id: 'rates',
    label: 'Token Rate',
    content: (
      <>
        <ListHeader label="Token Rate" />
        <ValueTable label="Token Rate">
          <ValueTableRow label="Last Minute" value="1,240 per minute" />
          <ValueTableRow label="Last Hour" value="910 per minute" />
          <ValueTableRow label="Peak Today" value="2,180 per minute" />
        </ValueTable>
      </>
    ),
  };
}

function triagePage(): PagedViewPage {
  return {
    id: 'triage',
    label: 'Triage',
    content: (
      <List gap="xs">
        <ListHeader label="Triage" />
        {PROJECTS.map((project) => (
          <ListItem
            action={OPEN_PROJECT}
            itemId={project.id}
            label={project.label}
            icon={<LucideIcon icon={Folder} name="folder" />}
            trailing={<Text variant="span">{String(project.open)}</Text>}
            selected={openProject.value === project.id}
          />
        ))}
      </List>
    ),
  };
}

export function PagedViewDemo() {
  const current = pages.value;
  const three = [todayPage(), tokenRatePage(), triagePage()];
  return (
    <CatalogExampleStack
      label="PagedView Variants"
      rootAttributes={{ 'data-demo': 'paged-view' }}
    >
      <CatalogExample
        label="Three Pages"
        note="Swipe or scroll sideways on a trackpad to page; the page snaps into place. Click a dot, or focus one and press Left, Right, Home, or End. Paging is instant when reduced motion is preferred."
        viewport={{ width: 'compact', height: 'medium', frame: 'solid' }}
      >
        <PagedView
          id="paged-view-demo-three"
          label="Activity Pages"
          pages={three}
          page={current['paged-view-demo-three']!}
        />
      </CatalogExample>
      <CatalogExample
        label="Two Pages"
        viewport={{ width: 'compact', height: 'short', frame: 'solid' }}
      >
        <PagedView
          id="paged-view-demo-two"
          label="Summary Pages"
          pages={[todayPage(), tokenRatePage()]}
          page={current['paged-view-demo-two']!}
        />
      </CatalogExample>
      <CatalogExample
        label="Narrow Sidebar"
        note="At a sidebar's width each page still fills the region and keeps the standard inset. The dots float at the bottom; a long page like Triage scrolls beneath them and ends clear of them."
        viewport={{ width: 'sidebar', height: 'medium', frame: 'solid' }}
      >
        <PagedView
          id="paged-view-demo-sidebar"
          label="Sidebar Pages"
          pages={three}
          page={current['paged-view-demo-sidebar']!}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/content-item.css';
import '@kerfjs/ui/app-tab.css';
import '@kerfjs/ui/tab-bar.css';
import '@kerfjs/ui/resizable-region.css';
import '@kerfjs/ui/workbench.css';

import { AppTab, type AppTabPresentation } from '@kerfjs/ui/app-tab';
import { ContentItem } from '@kerfjs/ui/content-item';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { TabBar, type TabBarPresentation } from '@kerfjs/ui/tab-bar';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireScrollDividers } from '@kerfjs/ui/wire-scroll-dividers';
import { Workbench } from '@kerfjs/ui/workbench';
import { mount } from 'kerfjs';
import { PanelLeft, Plus } from 'lucide';

/**
 * Scroll dividers across every pinned-chrome arrangement: a Pane (scrolling,
 * fitting, and `always` / `none`), a Workbench work area and rail, TabBar
 * strips in each presentation (and right-to-left), and an app-owned
 * `targets` arrangement whose chrome is a Toolbar and a List.
 */
const items = (count: number) =>
  Array.from({ length: count }, (_, index) => (
    <ContentItem>{`Item ${index + 1}`}</ContentItem>
  ));

const iconGroup = (label: string, icon: typeof Plus, name: string) => (
  <ToolbarControlGroup appearance="borderless" single>
    <button type="button" aria-label={label}>
      <LucideIcon icon={icon} name={name} />
    </button>
  </ToolbarControlGroup>
);

const pane = (
  name: string,
  count: number,
  chromeDividers?: 'scroll' | 'always' | 'none',
) => (
  <div data-case={name} style="height: 320px; display: grid">
    <Pane
      chromeDividers={chromeDividers}
      header={
        <Toolbar
          label={`${name} header`}
          leading={<ToolbarText text="Header" size="large" />}
        />
      }
      footer={
        <Toolbar
          label={`${name} footer`}
          leading={<ToolbarText text="Footer" size="small" />}
        />
      }
    >
      {items(count)}
    </Pane>
  </div>
);

const NAMES = [
  'Overview',
  'Backlog',
  'Activity',
  'Automations',
  'Settings',
  'Releases',
  'Milestones',
  'Reports',
];

const tabBar = (
  name: string,
  presentation: TabBarPresentation,
  dir?: 'rtl',
) => {
  const tab: AppTabPresentation =
    presentation === 'segmented' ? 'segmented' : 'pill';
  return (
    <div data-case={name} dir={dir} style="width: 360px">
      <TabBar
        id={name}
        label={name}
        presentation={presentation}
        leading={iconGroup('Show sidebar', PanelLeft, 'panel-left')}
        trailing={iconGroup('Add tab', Plus, 'plus')}
      >
        {NAMES.map((label, index) => (
          <AppTab
            id={`${name}-${index}`}
            name={label}
            selected={index === 0}
            closable={false}
            presentation={tab}
            size={presentation === 'segmented' ? 'compact' : 'default'}
          />
        ))}
      </TabBar>
    </div>
  );
};

const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
mount(root, () => (
  <List gap>
    {pane('pane-scroll', 16)}
    {pane('pane-fits', 1)}
    {pane('pane-always', 1, 'always')}
    {pane('pane-none', 16, 'none')}
    <div data-case="workbench" style="height: 360px; display: grid">
      <Workbench
        id="bench"
        label="Bench"
        mainToolbar={{
          label: 'Editor',
          title: <ToolbarText text="Editor" size="xlarge" />,
        }}
        mainHeader={<ContentItem>Supporting copy</ContentItem>}
        mainBottomToolbar={{
          label: 'Status',
          leading: <ToolbarText text="Ready" size="small" />,
        }}
        main={<>{items(16)}</>}
        leftRail={{
          label: 'Files',
          toolbar: { label: 'Files', title: <ToolbarText text="Files" /> },
          content: <>{items(16)}</>,
        }}
      />
    </div>
    {tabBar('tabs-rail', 'rail')}
    {tabBar('tabs-segmented', 'segmented')}
    {tabBar('tabs-inspector', 'inspector')}
    {tabBar('tabs-rtl', 'rail', 'rtl')}
    <div
      data-case="targets"
      style="height: 240px; display: grid; grid-template-rows: auto minmax(0, 1fr) auto"
    >
      <Toolbar
        label="Target top"
        leading={<ToolbarText text="Top" size="small" />}
      />
      <div id="target-scroller" style="overflow: auto">
        {items(12)}
      </div>
      <List>
        <ContentItem>Bottom</ContentItem>
      </List>
    </div>
  </List>
));

const targets = root.querySelector<HTMLElement>('[data-case="targets"]')!;
targets.querySelector('[data-component="toolbar"]')!.id = 'target-top';
targets.querySelector('[data-component="list"]')!.id = 'target-bottom';

const dispose = wireScrollDividers(root, {
  targets: [
    { scroller: 'target-scroller', top: 'target-top', bottom: 'target-bottom' },
  ],
});
(
  window as unknown as { disposeScrollDividers: () => void }
).disposeScrollDividers = dispose;

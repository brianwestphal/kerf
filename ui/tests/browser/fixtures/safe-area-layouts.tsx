import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/split-view.css';
import '@kerfjs/ui/resizable-region.css';
import '@kerfjs/ui/workbench.css';
import '@kerfjs/ui/tab-navigator.css';
import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/list.css';

import { CollapsiblePanel } from '@kerfjs/ui/collapsible-panel';
import { ContentItem } from '@kerfjs/ui/content-item';
import { List } from '@kerfjs/ui/list';
import { NavStack } from '@kerfjs/ui/nav-stack';
import { Pane, type PaneSeparatorSide } from '@kerfjs/ui/pane';
import { SplitView } from '@kerfjs/ui/split-view';
import { TabNavigator } from '@kerfjs/ui/tab-navigator';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { Workbench } from '@kerfjs/ui/workbench';
import { mount, signal } from 'kerfjs';

/**
 * Full-viewport layouts for the simulated safe-area browser tests. Each
 * scenario fills the app root the way a top-level shell would, so its outer
 * edges are the screen edges the test's `--kui-safe-area-*` overrides describe.
 */
type Scenario =
  | 'pane'
  | 'pane-bare'
  | 'workbench'
  | 'nav-stack'
  | 'nav-stack-pane'
  | 'tab-scaffold'
  | 'tab-scaffold-pane'
  | 'split-view'
  | 'split-view-resizable'
  | 'collapsible'
  | 'collapsible-edges'
  | 'app-bars'
  | 'app-bar-in-header';

const scenario = signal<Scenario>('pane');
const leftCollapsed = signal(false);
const drawerCollapsed = signal(false);
const rightCollapsed = signal(false);
const bottomCollapsed = signal(false);

const items = (prefix: string, count = 30) => (
  <div class="kui-content" data-safe-content={prefix}>
    {Array.from({ length: count }, (_, index) => (
      <ContentItem
        frame="framed"
        rootAttributes={{ 'data-safe-item': `${prefix}-${String(index + 1)}` }}
      >
        {`${prefix} item ${String(index + 1)}`}
      </ContentItem>
    ))}
  </div>
);

const toolbar = (title: string, divider: 'b' | 't' | '' = 'b') => (
  <Toolbar
    label={title}
    dividerSides={divider}
    leading={<ToolbarText text={title} size="xlarge" />}
    trailing={
      <ToolbarControlGroup appearance="borderless" single>
        <button type="button" aria-label={`${title} action`}>
          +
        </button>
      </ToolbarControlGroup>
    }
  />
);

const claimedBar = (
  title: string,
  edges: readonly PaneSeparatorSide[],
  divider: 'b' | 't',
) => (
  <Toolbar
    label={title}
    dividerSides={divider}
    safeAreaEdges={edges}
    leading={<ToolbarText text={title} />}
    trailing={
      <ToolbarControlGroup appearance="borderless" single>
        <button type="button" aria-label={`${title} action`}>
          +
        </button>
      </ToolbarControlGroup>
    }
  />
);

const pane = (title: string, withChrome = true) =>
  withChrome ? (
    <Pane
      label={title}
      header={toolbar(title)}
      footer={toolbar(`${title} footer`, 't')}
      rootAttributes={{ 'data-safe-pane': title }}
    >
      {items(title)}
    </Pane>
  ) : (
    <Pane label={title} rootAttributes={{ 'data-safe-pane': title }}>
      {items(title)}
    </Pane>
  );

function render() {
  switch (scenario.value) {
    case 'pane':
      return pane('Inbox');
    case 'pane-bare':
      return pane('Inbox', false);
    case 'workbench':
      return (
        <Workbench
          id="safe-workbench"
          label="Safe workbench"
          leftRail={{
            label: 'Navigator',
            collapsed: leftCollapsed.value,
            content: pane('Navigator', false),
          }}
          main={items('Editor')}
          rightRail={{ label: 'Inspector', content: items('Inspector', 3) }}
          bottomDrawer={{
            label: 'Console',
            collapsed: drawerCollapsed.value,
            content: items('Console', 6),
          }}
        />
      );
    case 'nav-stack':
      return (
        <NavStack
          id="safe-nav-stack"
          label="Safe stack"
          views={[
            {
              key: 'root',
              toolbar: { title: 'Messages' },
              content: items('Messages'),
              bottomToolbar: { label: 'Messages bottom', dividerSides: '' },
            },
          ]}
        />
      );
    case 'nav-stack-pane':
      // A view whose only child is a Pane: the Pane fills the view and its
      // slots take the edges the view still reaches.
      return (
        <NavStack
          id="safe-nav-stack"
          label="Safe stack"
          views={[
            {
              key: 'root',
              toolbar: { title: 'Messages' },
              content: pane('Messages'),
            },
          ]}
        />
      );
    case 'tab-scaffold-pane':
      return (
        <TabNavigator
          id="safe-tabs"
          label="Sections"
          active="home"
          tabs={[{ id: 'home', label: 'Home', content: pane('Home') }]}
        />
      );
    case 'tab-scaffold':
      return (
        <TabNavigator
          id="safe-tabs"
          label="Sections"
          active="home"
          tabs={[
            { id: 'home', label: 'Home', content: items('Home') },
            { id: 'search', label: 'Search', content: items('Search') },
          ]}
        />
      );
    case 'split-view':
    case 'split-view-resizable':
      return (
        <SplitView
          id="safe-split"
          label="Mail"
          listTitle="Threads"
          detailTitle="Message"
          list={items('Threads')}
          detail={pane('Message')}
          resizable={
            scenario.value === 'split-view-resizable'
              ? { size: 300, min: 200, max: 480 }
              : undefined
          }
        />
      );
    case 'app-bars':
      // An app-owned shell: a top app bar and a bottom bar claim their screen
      // edges; the Pane between them reaches only the two sides.
      return (
        <List fill>
          {claimedBar(
            'App bar',
            ['block-start', 'inline-start', 'inline-end'],
            'b',
          )}
          <List flex>
            <Pane
              label="Body"
              safeAreaEdges={['inline-start', 'inline-end']}
              rootAttributes={{ 'data-safe-pane': 'Body' }}
            >
              {items('Body')}
            </Pane>
          </List>
          {claimedBar(
            'Bottom bar',
            ['block-end', 'inline-start', 'inline-end'],
            't',
          )}
        </List>
      );
    case 'app-bar-in-header':
      // A Pane header already owns the top edge: a toolbar there that claims
      // every side must not add the inset a second time.
      return (
        <Pane
          label="Claimed"
          header={claimedBar(
            'Claimed header',
            ['block-start', 'block-end', 'inline-start', 'inline-end'],
            'b',
          )}
          rootAttributes={{ 'data-safe-pane': 'Claimed' }}
        >
          {items('Claimed')}
        </Pane>
      );
    case 'collapsible':
      return (
        <div style="display: flex; height: 100%; min-height: 0" data-safe-row>
          <CollapsiblePanel
            id="safe-rail"
            side="left"
            size={240}
            collapsed={leftCollapsed.value}
            label="Rail"
          >
            {pane('Rail', false)}
          </CollapsiblePanel>
          <div style="flex: 1; min-width: 0; display: grid" data-safe-main>
            {pane('Main')}
          </div>
        </div>
      );
    case 'collapsible-edges':
      // A right rail and a bottom drawer: each takes its edge from the
      // siblings before it in its container (the work column and the Main
      // pane), and hands it back when it collapses.
      return (
        <div style="display: flex; height: 100%; min-height: 0" data-safe-row>
          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column">
            <div style="flex: 1; min-height: 0; display: grid" data-safe-main>
              {pane('Main', false)}
            </div>
            <CollapsiblePanel
              id="safe-drawer"
              side="bottom"
              size={160}
              collapsed={bottomCollapsed.value}
              label="Drawer"
            >
              {pane('Drawer', false)}
            </CollapsiblePanel>
          </div>
          <CollapsiblePanel
            id="safe-right"
            side="right"
            size={220}
            collapsed={rightCollapsed.value}
            label="Inspector"
          >
            {pane('Inspector', false)}
          </CollapsiblePanel>
        </div>
      );
  }
}

const root = document.querySelector<HTMLElement>('[data-safe-area-root]')!;
mount(root, render);

Object.assign(globalThis, {
  safeAreaFixture: {
    show(next: Scenario) {
      scenario.value = next;
    },
    collapseLeft(value: boolean) {
      leftCollapsed.value = value;
    },
    collapseDrawer(value: boolean) {
      drawerCollapsed.value = value;
    },
    collapseRight(value: boolean) {
      rightCollapsed.value = value;
    },
    collapseBottom(value: boolean) {
      bottomCollapsed.value = value;
    },
  },
});

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
import '@kerfjs/ui/tab-scaffold.css';
import '@kerfjs/ui/collapsible-panel.css';

import { CollapsiblePanel } from '@kerfjs/ui/collapsible-panel';
import { NavStack } from '@kerfjs/ui/nav-stack';
import { Pane } from '@kerfjs/ui/pane';
import { SplitView } from '@kerfjs/ui/split-view';
import { TabScaffold } from '@kerfjs/ui/tab-scaffold';
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
  | 'tab-scaffold'
  | 'split-view'
  | 'split-view-resizable'
  | 'collapsible';

const scenario = signal<Scenario>('pane');
const leftCollapsed = signal(false);
const drawerCollapsed = signal(false);

const items = (prefix: string, count = 30) => (
  <div class="kui-content" data-safe-content={prefix}>
    {Array.from({ length: count }, (_, index) => (
      <div
        class="kui-content-item"
        data-safe-item={`${prefix}-${String(index + 1)}`}
        style="--kui-content-item-border: var(--kui-color-border)"
      >
        {prefix} item {index + 1}
      </div>
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
              title: 'Messages',
              content: items('Messages'),
              bottomToolbar: toolbar('Messages bottom', ''),
            },
          ]}
        />
      );
    case 'tab-scaffold':
      return (
        <TabScaffold
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
  },
});

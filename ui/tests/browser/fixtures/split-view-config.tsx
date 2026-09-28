import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/floating-toolbar.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/split-view.css';
import '@kerfjs/ui/resizable-region.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/list-item.css';

import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { List } from '@kerfjs/ui/list';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SplitView } from '@kerfjs/ui/split-view';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { mount, signal } from 'kerfjs';
import { Archive, PanelLeftOpen, Reply, SquarePen } from 'lucide';

/**
 * SplitView's forwarded configuration in a real browser: the roomy list's
 * ResizableRegion options (collapse with a restore corner, a hidden separator)
 * and the compact NavStack's toolbar configuration and per-view toolbars.
 */
type Scenario = 'roomy' | 'compact';

const scenario = signal<Scenario>('roomy');
const collapsed = signal(false);
const detailActive = signal(true);

const threads = (
  <List>
    {['Project update', 'Design review', 'Launch plan'].map((label, index) => (
      <ListItem
        action="open-thread"
        itemId={String(index)}
        label={label}
        selected={index === 0}
      />
    ))}
  </List>
);

const message = (
  <div class="kui-content">
    <div class="kui-content-item" data-split-config-detail>
      The interaction pass is ready for review.
    </div>
  </div>
);

const iconButton = (
  label: string,
  icon: Parameters<typeof LucideIcon>[0]['icon'],
  name: string,
) => (
  <ToolbarControlGroup label={label} appearance="borderless" single>
    <button type="button" aria-label={label}>
      <LucideIcon icon={icon} name={name} />
    </button>
  </ToolbarControlGroup>
);

function render() {
  if (scenario.value === 'roomy')
    return (
      <SplitView
        id="split-config-roomy"
        label="Messages"
        listTitle="Threads"
        detailTitle="Project update"
        list={threads}
        detail={message}
        resizable={{
          size: 280,
          min: 220,
          max: 420,
          separator: 'hidden',
          collapsed: collapsed.value,
          collapseMotion: 'fade-slide',
          restorePosition: 'bottom-start',
          restoreControl: (
            <FloatingToolbar label="Threads" position="bottom-start">
              {iconButton('Show threads', PanelLeftOpen, 'panel-left-open')}
            </FloatingToolbar>
          ),
        }}
      />
    );
  return (
    <SplitView
      id="split-config-compact"
      label="Compact messages"
      compact
      detailActive={detailActive.value}
      listTitle="Inbox"
      detailTitle="Project update"
      list={threads}
      detail={message}
      compactStack={{
        backText: 'Inbox',
        toolbarConfig: { dividerSides: 'b', headingLevel: 1 },
        list: { toolbar: iconButton('Compose', SquarePen, 'square-pen') },
        detail: {
          toolbar: iconButton('Reply', Reply, 'reply'),
          bottomToolbar: (
            <Toolbar
              label="Message actions"
              dividerSides=""
              leading={<ToolbarText text="Updated just now" size="small" />}
              trailing={iconButton('Archive', Archive, 'archive')}
            />
          ),
        },
      }}
    />
  );
}

const root = document.querySelector<HTMLElement>('[data-split-config-root]')!;
mount(root, render);

(
  window as unknown as {
    splitConfig: {
      show(value: Scenario): void;
      collapse(value: boolean): void;
      detail(value: boolean): void;
    };
  }
).splitConfig = {
  show: (value) => (scenario.value = value),
  collapse: (value) => (collapsed.value = value),
  detail: (value) => (detailActive.value = value),
};

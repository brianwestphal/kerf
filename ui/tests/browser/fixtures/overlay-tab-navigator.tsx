import { ContentItem } from '@kerfjs/ui/content-item';
import { NavStack } from '@kerfjs/ui/nav-stack';
import { Pane } from '@kerfjs/ui/pane';
import { TabNavigator, type TabNavigatorTab } from '@kerfjs/ui/tab-navigator';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import { wireScrollDividers } from '@kerfjs/ui/wire-scroll-dividers';
import { wireTabNavigator } from '@kerfjs/ui/wire-tab-navigator';

// A TabNavigator whose tab bar is laid over the active scene
// (`barPresentation="overlay"`). `wireTabNavigator` measures the live bar and
// the scenes hand its height to their content as the block-end edge context:
// a plain scene (the scene scrolls), a sole Pane scene, and a NavStack scene
// whose own overlay bottom toolbar then sits just above the bar all rest
// their last item clear of it. The `safe` region adds a bottom safe area the
// bar pads for; the unwired copy keeps its bar docked.
const rows = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => (
    <ContentItem>{`${prefix} ${index + 1}`}</ContentItem>
  ));

const plain = (prefix: string): TabNavigatorTab['content'] => (
  <div class="kui-content">{rows(prefix, 30)}</div>
);

const tabs = (
  name: string,
  content: TabNavigatorTab['content'],
): readonly TabNavigatorTab[] => [
  { id: 'inbox', label: 'Inbox', content },
  { id: 'sent', label: 'Sent', content: plain(`${name} sent`) },
  { id: 'archive', label: 'Archive', content: plain(`${name} archive`) },
];

const navigator = (name: string, content: TabNavigatorTab['content']) => (
  <TabNavigator
    id={`tabs-${name}`}
    label="Sections"
    active="inbox"
    barPresentation="overlay"
    tabs={tabs(name, content)}
  />
);

const region = (
  name: string,
  content: TabNavigatorTab['content'],
  style = '',
) => (
  <section
    data-region={name}
    style={`display:grid;grid-template-rows:minmax(0,1fr);height:420px;width:360px;margin:16px;${style}`}
  >
    {navigator(name, content)}
  </section>
);

const app = document.querySelector<HTMLElement>('[data-app]')!;
app.innerHTML = String(
  <>
    {region('plain', plain('Message'))}
    {region('pane', <Pane label="Inbox">{rows('Reply', 30)}</Pane>)}
    {region(
      'stack',
      <NavStack
        id="stack"
        label="Inbox"
        views={[
          {
            key: 'inbox',
            toolbar: { title: 'Inbox' },
            content: rows('Thread', 30),
          },
        ]}
        bottomToolbarPresentation="overlay"
        bottomToolbar={{
          label: 'Inbox Actions',
          center: <ToolbarText text="Updated now" />,
        }}
      />,
    )}
    {region('safe', plain('Safe'), '--kui-safe-area-block-end:24px')}
    {region('unwired', plain('Docked'))}
  </>,
);

for (const name of ['plain', 'pane', 'stack', 'safe'])
  wireTabNavigator(app.querySelector(`[data-region="${name}"]`)!, {
    onSelect: () => {},
  });
wireNavStack(app.querySelector('#stack')!);
wireScrollDividers(app);

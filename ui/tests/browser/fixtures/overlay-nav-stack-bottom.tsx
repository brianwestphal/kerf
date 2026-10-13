import { ContentItem } from '@kerfjs/ui/content-item';
import { List } from '@kerfjs/ui/list';
import { NavStack, type NavStackView } from '@kerfjs/ui/nav-stack';
import { TabNavigator } from '@kerfjs/ui/tab-navigator';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import { wireScrollDividers } from '@kerfjs/ui/wire-scroll-dividers';
import { mount, signal } from 'kerfjs';

// A NavStack whose bottom toolbar is laid over the active view
// (`bottomToolbarPresentation="overlay"`), with its top chrome overlaid too.
// `wireNavStack` measures the live toolbar and hands its height to the views
// as the block-end edge context: the plain root view (the view scrolls), the
// pushed sole-Pane view, and a Pane with its own footer all rest their last
// item clear of it. The `safe` region adds a bottom safe area the toolbar
// pads for; the `tabs` region nests the stack in a TabNavigator scene above
// the tab bar; the unwired copy keeps its toolbar docked. The toolbar's
// center status is an untoned ToolbarText with a quiet description, and its
// trailing control a plain text button in a ToolbarControlGroup: the colors
// that must stay at AA over the material.
const rows = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => (
    <ContentItem>{`${prefix} ${index + 1}`}</ContentItem>
  ));

const bottomToolbar = {
  label: 'Inbox Actions',
  center: <ToolbarText text="Updated now" description="3 unread" />,
  trailing: (
    <ToolbarControlGroup label="Compose" single>
      <button type="button" data-compose>
        Compose
      </button>
    </ToolbarControlGroup>
  ),
};

const root: NavStackView = {
  key: 'inbox',
  toolbar: { title: 'Inbox' },
  content: rows('Message', 30),
};

// The pushed Pane holds its rows in a List, as the catalog's inbox does: the
// List must keep its full height in the Pane's content (a List shrunk to the
// content box lets its rows overflow it, and the scroller then drops the
// block-end padding that clears the toolbar).
const detail: NavStackView = {
  key: 'detail',
  toolbar: { title: 'Message' },
  pane: {},
  content: <List>{rows('Reply', 30)}</List>,
};

const withFooter: NavStackView = {
  key: 'footer',
  toolbar: { title: 'Thread' },
  footer: <ToolbarText text="Draft saved" />,
  content: rows('Note', 30),
};

const views = signal<NavStackView[]>([root]);

const stack = (name: string, stackViews: NavStackView[]) => (
  <NavStack
    id={`stack-${name}`}
    label="Inbox"
    views={stackViews}
    chromePresentation="overlay"
    bottomToolbarPresentation="overlay"
    bottomToolbar={bottomToolbar}
  />
);

const region = (name: string, style = '', stackViews = views.value) => (
  <section
    data-region={name}
    style={`display:grid;grid-template-rows:minmax(0,1fr);height:360px;width:360px;margin:16px;${style}`}
  >
    {stack(name, stackViews)}
  </section>
);

const app = document.querySelector<HTMLElement>('[data-app]')!;
mount(app, () => (
  <>
    {region('wired')}
    {region('safe', '--kui-safe-area-block-end:24px')}
    {region('footer', '', [withFooter])}
    <section
      data-region="tabs"
      style="display:grid;grid-template-rows:minmax(0,1fr);height:420px;width:360px;margin:16px;--kui-safe-area-block-end:24px"
    >
      <TabNavigator
        id="tabs"
        label="Sections"
        active="inbox"
        tabs={[
          { id: 'inbox', label: 'Inbox', content: stack('tabs', [root]) },
          { id: 'sent', label: 'Sent', content: rows('Sent', 3) },
        ]}
      />
    </section>
    {region('unwired')}
  </>
));

for (const name of ['wired', 'safe', 'footer', 'tabs'])
  wireNavStack(app.querySelector(`[data-region="${name}"]`)!);
wireScrollDividers(app);

Object.assign(globalThis, {
  push: () => {
    views.value = [root, detail];
  },
  pop: () => {
    views.value = [root];
  },
});

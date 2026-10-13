import { ContentItem } from '@kerfjs/ui/content-item';
import { NavStack, type NavStackView } from '@kerfjs/ui/nav-stack';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import { wireScrollDividers } from '@kerfjs/ui/wire-scroll-dividers';
import { mount, signal } from 'kerfjs';

// A NavStack whose top chrome is laid over the active view
// (`chromePresentation="overlay"`). `wireNavStack` measures the live chrome
// and hands its height to the views as the block-start edge context: the
// plain root view (the view scrolls) and the pushed sole-Pane view both clear
// it. The `safe` region adds a top safe area the chrome pads for; the
// unwired copy keeps its chrome docked. The root view's trailing status is a
// default-size ToolbarText with a quiet description, the colors that need
// lifting to stay at AA over the material.
const rows = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => (
    <ContentItem>{`${prefix} ${index + 1}`}</ContentItem>
  ));

const root: NavStackView = {
  key: 'inbox',
  toolbar: {
    title: 'Inbox',
    trailing: <ToolbarText text="Synced" description="3 unread" />,
  },
  content: rows('Message', 30),
};

const detail: NavStackView = {
  key: 'detail',
  toolbar: { title: 'Message' },
  pane: {},
  content: rows('Reply', 30),
};

const views = signal<NavStackView[]>([root]);

const region = (name: string, style = '') => (
  <section
    data-region={name}
    style={`display:grid;grid-template-rows:minmax(0,1fr);height:360px;width:360px;margin:16px;${style}`}
  >
    <NavStack
      id={`stack-${name}`}
      label="Inbox"
      views={views.value}
      chromePresentation="overlay"
    />
  </section>
);

const app = document.querySelector<HTMLElement>('[data-app]')!;
mount(app, () => (
  <>
    {region('wired')}
    {region('safe', '--kui-safe-area-block-start:24px')}
    {region('unwired')}
  </>
));

for (const name of ['wired', 'safe'])
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

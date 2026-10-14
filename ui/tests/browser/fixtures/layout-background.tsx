import { ContentItem } from '@kerfjs/ui/content-item';
import { fillColor, uiColor } from '@kerfjs/ui/css-values';
import { NavStack } from '@kerfjs/ui/nav-stack';
import { Pane } from '@kerfjs/ui/pane';
import { TabNavigator } from '@kerfjs/ui/tab-navigator';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

// App-chosen layout backgrounds (KF-C7GSDQ): a Pane, a sunken Pane with a
// color that replaces its lowered fill, a NavStack, and a TabNavigator whose
// first tab paints its scene in its own color.
const rows = (count: number) =>
  Array.from({ length: count }, (_, index) => (
    <ContentItem>{`Track ${index + 1}`}</ContentItem>
  ));

const tile = (name: string, content: Parameters<typeof String>[0]) => (
  <section
    data-region={name}
    style="display:grid;grid-template-rows:minmax(0,1fr);height:280px;width:300px"
  >
    {content}
  </section>
);

const app = document.querySelector<HTMLElement>('[data-app]')!;
app.innerHTML = String(
  <div style="display:flex;flex-wrap:wrap;gap:16px;padding:16px">
    {tile(
      'pane',
      <Pane
        label="Album"
        background={fillColor('light-dark(#e6edfb, #1b2438)')}
        safeAreaEdges={[]}
        header={
          <Toolbar
            label="Album Header"
            leading={<ToolbarText text="Night Drive" size="xlarge" />}
          />
        }
      >
        {rows(3)}
      </Pane>,
    )}
    {tile(
      'sunken',
      <Pane
        label="Sunken"
        appearance="sunken"
        background={fillColor('light-dark(#f3e8fb, #2a1d36)')}
        safeAreaEdges={[]}
      >
        {rows(3)}
      </Pane>,
    )}
    {tile(
      'nav-stack',
      <NavStack
        id="music"
        label="Music"
        background={fillColor('light-dark(#e8f5ec, #18291e)')}
        views={[
          {
            key: 'library',
            toolbar: { title: 'Library' },
            content: rows(3),
          },
        ]}
      />,
    )}
    {tile(
      'tab-navigator',
      <TabNavigator
        id="tabs"
        label="Sections"
        active="now"
        background={uiColor('surface-raised')}
        tabs={[
          {
            id: 'now',
            label: 'Now Playing',
            content: rows(3),
            background: fillColor('light-dark(#fbeee6, #36231a)'),
          },
          { id: 'library', label: 'Library', content: rows(2) },
        ]}
      />,
    )}
  </div>,
);

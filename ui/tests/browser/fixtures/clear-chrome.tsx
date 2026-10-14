import { BackdropImage } from '@kerfjs/ui/backdrop-image';
import { ContentItem } from '@kerfjs/ui/content-item';
import { remify, uiColor } from '@kerfjs/ui/css-values';
import { NavStack } from '@kerfjs/ui/nav-stack';
import { Pane } from '@kerfjs/ui/pane';
import { TabNavigator } from '@kerfjs/ui/tab-navigator';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import { wireScrollDividers } from '@kerfjs/ui/wire-scroll-dividers';
import { wireTabNavigator } from '@kerfjs/ui/wire-tab-navigator';

// Clear chrome (KF-TQ3NHD): a Pane header, a NavStack's top chrome and
// bottom toolbar, and a TabNavigator bar laid over their content fully
// transparent, each with `scrollEdge="material"`, over a colored hero block.
const hero = (
  <div
    data-hero
    style="flex:none;height:220px;background:linear-gradient(160deg,#ff6b3d,#5b2a86 60%,#11243f)"
  />
);
const rows = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => (
    <ContentItem>{`${prefix} ${index + 1}`}</ContentItem>
  ));

const region = (name: string, content: unknown) => (
  <section
    data-region={name}
    style="display:grid;grid-template-rows:minmax(0,1fr);height:420px;width:360px;margin:16px"
  >
    {content as never}
  </section>
);

const glass = (
  <ToolbarControlGroup label="Album Actions" material="glass">
    <button type="button" aria-label="Share">
      ⇪
    </button>
  </ToolbarControlGroup>
);

const app = document.querySelector<HTMLElement>('[data-app]')!;
app.innerHTML = String(
  <div style="display:flex;flex-wrap:wrap">
    {region(
      'pane',
      <Pane
        label="Album"
        safeAreaEdges={[]}
        headerPresentation="clear"
        scrollEdge="material"
        header={
          <Toolbar
            label="Album Header"
            leading={<ToolbarText text="Night Drive" />}
            trailing={glass}
          />
        }
      >
        {hero}
        {rows('Track', 20)}
      </Pane>,
    )}
    {region(
      'stack',
      <NavStack
        id="stack"
        label="Music"
        chromePresentation="clear"
        bottomToolbarPresentation="clear"
        scrollEdge="material"
        views={[
          {
            key: 'album',
            toolbar: { title: 'Album', trailing: glass },
            content: [hero, rows('Song', 20)],
          },
        ]}
        bottomToolbar={{
          label: 'Player',
          center: <ToolbarText text="Now Playing" />,
        }}
      />,
    )}
    {region(
      'tabs',
      <TabNavigator
        id="tabs"
        label="Sections"
        active="listen"
        barPresentation="clear"
        scrollEdge="material"
        tabs={[
          {
            id: 'listen',
            label: 'Listen',
            content: (
              <div class="kui-content">
                {hero}
                {rows('Pick', 20)}
              </div>
            ),
          },
          { id: 'search', label: 'Search', content: rows('Result', 3) },
        ]}
      />,
    )}
    {region(
      'under',
      <Pane
        label="Artist"
        safeAreaEdges={[]}
        headerPresentation="clear"
        scrollEdge="material"
        header={<Toolbar label="Artist Header" trailing={glass} />}
      >
        <BackdropImage
          src="./missing-artwork.png"
          alt=""
          height={remify(200)}
          fadeTo={uiColor('surface')}
          parallax="subtle"
          underChrome
          overlay={<ToolbarText text="Night Harbor" size="xlarge" />}
        >
          {rows('Song', 20)}
        </BackdropImage>
      </Pane>,
    )}
  </div>,
);

wireNavStack(app.querySelector('#stack')!);
wireTabNavigator(app.querySelector('[data-region="tabs"]')!, {
  onSelect: () => {},
});
wireScrollDividers(app);

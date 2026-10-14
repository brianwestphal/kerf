import { BackdropImage } from '@kerfjs/ui/backdrop-image';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { remify, uiColor } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ChevronLeft, Ellipsis, Share } from 'lucide';

// Generated artwork, so the catalog needs no network or binary assets: a dusk
// sky, a sun, and three ridge lines whose depth makes the parallax legible.
const SKYLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a5c"/><stop offset=".55" stop-color="#c2577a"/><stop offset="1" stop-color="#f4b36b"/></linearGradient>
<radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient></defs>
<rect width="1600" height="900" fill="url(#s)"/>
<circle cx="1080" cy="470" r="220" fill="url(#g)"/><circle cx="1080" cy="470" r="86" fill="#ffe9b0"/>
<path d="M0 560 L180 430 L330 520 L520 360 L700 500 L880 400 L1060 540 L1260 380 L1440 500 L1600 420 V900 H0Z" fill="#7a3f6e"/>
<path d="M0 650 L220 540 L400 620 L600 500 L820 640 L1000 560 L1200 660 L1400 560 L1600 640 V900 H0Z" fill="#4b2a5a"/>
<path d="M0 760 L260 660 L480 740 L720 650 L940 760 L1180 680 L1400 770 L1600 700 V900 H0Z" fill="#241a3d"/>
</svg>`;

// A small seamless tile for the repeat form.
const TILE = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
<rect width="48" height="48" fill="#2f4a7a"/><path d="M0 24 L24 0 L48 24 L24 48Z" fill="#3c5e96"/><circle cx="24" cy="24" r="5" fill="#f4b36b"/>
</svg>`;

// A blob URL rather than a data URL: kerf screens `data:image/svg+xml` out of
// URL attributes because an SVG document can carry script.
// Created on first render and reused, so re-renders do not leak blob URLs.
const urls = new Map<string, string>();
const svgUrl = (svg: string) => {
  let url = urls.get(svg);
  if (url === undefined) {
    url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    urls.set(svg, url);
  }
  return url;
};

const TRACKS = [
  ['Low Tide', '3:42'],
  ['Harbor Lights', '4:05'],
  ['Northbound', '3:18'],
  ['Glass Coast', '5:01'],
  ['Undertow', '3:56'],
  ['Night Ferry', '4:27'],
  ['Salt Air', '2:59'],
  ['Last Call', '4:12'],
  ['Lantern', '3:33'],
  ['Morning Swell', '4:48'],
] as const;

function TrackList() {
  return (
    <List>
      <ListHeader
        label="Top Songs"
        count={TRACKS.length}
        countLabel={`${String(TRACKS.length)} songs`}
      />
      {TRACKS.map(([title, length], index) => (
        <ListItem
          action="log-backdrop-track"
          itemId={`track-${String(index + 1)}`}
          label={title}
          trailing={
            <Text variant="span" tone="quiet">
              {length}
            </Text>
          }
        />
      ))}
    </List>
  );
}

export function BackdropImageDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'backdrop-image' }}>
      <CatalogExample
        label="Parallax Hero With Progressive Blur"
        note='Scroll the pane: parallax="subtle" lags the image behind the content, blur cross-fades in a copy blurred once (with a light dim) as the image scrolls away, and fadeTo dissolves it into the surface color, which keeps painting under the songs. Only transform and opacity animate, on a scroll-driven timeline; the image stays static and sharp under reduced motion or without scroll-driven animations.'
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <Pane label="Artist" rootAttributes={{ 'data-backdrop-demo': 'hero' }}>
          <BackdropImage
            src={svgUrl(SKYLINE)}
            alt=""
            parallax="subtle"
            blur={{ dim: 0.2 }}
            fadeTo={uiColor('surface')}
            overlay={
              <Toolbar
                label="Artist"
                leading={
                  <ToolbarText
                    text="Night Harbor"
                    size="xlarge"
                    headingLevel={2}
                  />
                }
              />
            }
          >
            <TrackList />
          </BackdropImage>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Clear Header"
        note='headerPresentation="clear" lays the header over the content fully transparent, so its glass control groups float over the artwork. scrollEdge="material" fades the chrome material in behind the header once content scrolls beneath it, and out again at the top.'
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <Pane
          label="Album"
          headerPresentation="clear"
          scrollEdge="material"
          rootAttributes={{ 'data-backdrop-demo': 'clear-header' }}
          header={
            <Toolbar
              label="Album Header"
              leading={
                <ToolbarControlGroup
                  label="Navigation"
                  content="icon"
                  material="glass"
                  single
                >
                  <button
                    type="button"
                    aria-label="Back"
                    data-action="log-backdrop-track"
                  >
                    <LucideIcon icon={ChevronLeft} name="chevron-left" />
                  </button>
                </ToolbarControlGroup>
              }
              trailing={
                <ToolbarControlGroup
                  label="Album Actions"
                  content="icon"
                  material="glass"
                >
                  <button
                    type="button"
                    aria-label="Share"
                    data-action="log-backdrop-track"
                  >
                    <LucideIcon icon={Share} name="share" />
                  </button>
                  <button
                    type="button"
                    aria-label="More"
                    data-action="log-backdrop-track"
                  >
                    <LucideIcon icon={Ellipsis} name="ellipsis" />
                  </button>
                </ToolbarControlGroup>
              }
            />
          }
        >
          <BackdropImage
            src={svgUrl(SKYLINE)}
            alt=""
            parallax="subtle"
            fadeTo={uiColor('surface')}
            overlay={
              <Toolbar
                label="Album"
                leading={
                  <ToolbarText
                    text="Night Harbor"
                    size="xlarge"
                    headingLevel={2}
                  />
                }
              />
            }
          >
            <TrackList />
          </BackdropImage>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Scrim Under a Title"
        note='scrim="bottom" darkens the image toward the title, which uses the dark toolbar tone. Without fadeTo the image ends on a hard edge.'
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'medium',
          surface: 'default',
        }}
      >
        <Pane label="Place">
          <BackdropImage
            src={svgUrl(SKYLINE)}
            alt="Ridges at dusk under a low sun"
            position="bottom"
            height={remify(240)}
            scrim="bottom"
            overlay={
              <Toolbar
                label="Place"
                leading={
                  <ToolbarText
                    text="Coastal Ridge"
                    size="xlarge"
                    tone="dark"
                    headingLevel={2}
                  />
                }
              />
            }
          >
            <ListInsetText>
              A ridge walk above the harbor, best at dusk.
            </ListInsetText>
          </BackdropImage>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Tiled Background"
        note='repeat="repeat" tiles the image at its natural size instead of fitting one copy; fadeTo still dissolves it into the surface.'
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'short',
          surface: 'default',
        }}
      >
        <Pane label="Collection">
          <BackdropImage
            src={svgUrl(TILE)}
            alt=""
            repeat="repeat"
            height={remify(160)}
            fadeTo={uiColor('surface')}
          >
            <ListInsetText>Patterned collection header.</ListInsetText>
          </BackdropImage>
        </Pane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

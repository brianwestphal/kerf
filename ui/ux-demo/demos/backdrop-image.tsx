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

import { SKYLINE, svgUrl, TILE } from '../components/sample-artwork.js';

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
        note='headerPresentation="clear" lays the header over the content fully transparent, so its glass control groups float over the artwork. scrollEdge="material" fades the chrome material in behind the header once content scrolls beneath it, and out again at the top. underChrome runs the artwork up beneath the header.'
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
            underChrome
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
        note='scrim="bottom" darkens the image toward the title, and the overlay takes the dark color scheme over it, so a default-tone title reads light in both schemes. Without fadeTo the image ends on a hard edge.'
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

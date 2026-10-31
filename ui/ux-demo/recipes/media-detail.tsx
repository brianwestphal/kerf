import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/backdrop-image.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/toolbar-control-group.css';

import { BackdropImage } from '@kerfjs/ui/backdrop-image';
import { fillColor, uiColor } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { NavStack, type NavStackView } from '@kerfjs/ui/nav-stack';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireScrollDividers } from '@kerfjs/ui/wire-scroll-dividers';
import { signal } from 'kerfjs';
import { ChevronRight, Disc3, Ellipsis, Play, Share, Shuffle } from 'lucide';

import type { RecipeFactory, RecipePresentation } from './types.js';

export const presentation: RecipePresentation = {
  viewport: {
    layout: 'grid',
    width: 'compact',
    height: 'tall',
    frame: 'solid',
    surface: 'default',
    overflow: 'hidden',
    shadow: true,
  },
  note: "An Apple-Music-style detail page composed only from components: a NavStack with clear chrome and the scroll-edge material, a scoped tint from the artwork's bottom color, an underChrome BackdropImage with parallax and progressive blur that fades into the tinted surface, and glass control groups. The app owns the artwork, its two colors (the tint and its scheme), the stack, playback, and data.",
};

interface Album {
  id: string;
  title: string;
  artist: string;
  /** The artwork's bottom color, which the app already knows. */
  tint: string;
  tracks: readonly (readonly [title: string, length: string])[];
}

const ALBUMS: readonly Album[] = [
  {
    id: 'night-harbor',
    title: 'Night Harbor',
    artist: 'The Lanterns',
    tint: '#2a1a3d',
    tracks: [
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
    ],
  },
];

// Generated artwork, so the recipe needs no network or binary assets: a dusk
// sky over three ridge lines whose depth makes the parallax legible.
const ARTWORK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a5c"/><stop offset=".5" stop-color="#c2577a"/><stop offset="1" stop-color="#f4b36b"/></linearGradient>
<radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient></defs>
<rect width="1600" height="1200" fill="url(#s)"/>
<circle cx="1080" cy="560" r="240" fill="url(#g)"/><circle cx="1080" cy="560" r="96" fill="#ffe9b0"/>
<path d="M0 680 L180 540 L330 640 L520 470 L700 620 L880 510 L1060 660 L1260 490 L1440 620 L1600 530 V1200 H0Z" fill="#7a3f6e"/>
<path d="M0 820 L220 700 L400 790 L600 660 L820 810 L1000 720 L1200 830 L1400 720 L1600 810 V1200 H0Z" fill="#4b2a5a"/>
<path d="M0 960 L260 850 L480 940 L720 840 L940 960 L1180 880 L1400 970 L1600 900 V1200 H0Z" fill="#2a1a3d"/>
</svg>`;

// A blob URL rather than a data URL: older kerf releases this package still
// supports screen `data:image/svg+xml` out of every URL attribute; current kerf
// allows it in `<img src>`. Created once and
// reused, so re-renders do not leak blob URLs.
let artworkUrl: string | undefined;
const artwork = () =>
  (artworkUrl ??= URL.createObjectURL(
    new Blob([ARTWORK], { type: 'image/svg+xml' }),
  ));

/** A playback command: icon-only with `label` as its name, or labeled. */
const command = (
  name: string,
  label: string,
  icon: SafeIcon,
  visibleLabel = false,
) =>
  visibleLabel ? (
    <ToolbarButton
      action="recipe-action"
      rootAttributes={{ 'data-recipe-command': name }}
      icon={icon}
    >
      {label}
    </ToolbarButton>
  ) : (
    <ToolbarButton
      ariaLabel={label}
      action="recipe-action"
      rootAttributes={{ 'data-recipe-command': name }}
      icon={icon}
    />
  );

type SafeIcon = ReturnType<typeof LucideIcon>;

export const createRecipe: RecipeFactory = (announce) => {
  const libraryView = (): NavStackView => ({
    key: 'library',
    toolbar: { title: 'Library' },
    content: (
      <List>
        <section>
          <ListHeader label="Albums" />
          {ALBUMS.map((album) => (
            <ListItem
              action="recipe-action"
              itemId={album.id}
              label={album.title}
              description={album.artist}
              icon={<LucideIcon icon={Disc3} name="disc-3" />}
              trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
            />
          ))}
        </section>
      </List>
    ),
  });

  const albumView = (album: Album): NavStackView => ({
    key: album.id,
    toolbar: {
      title: '',
      trailing: (
        <ToolbarControlGroup
          label="Album Actions"
          content="icon"
          material="glass"
        >
          {command('share', 'Share', <LucideIcon icon={Share} name="share" />)}
          {command(
            'more',
            'More',
            <LucideIcon icon={Ellipsis} name="ellipsis" />,
          )}
        </ToolbarControlGroup>
      ),
    },
    pane: { safeAreaEdges: [] },
    content: (
      <BackdropImage
        src={artwork()}
        alt={`${album.title} artwork: ridges at dusk under a low sun`}
        position="bottom"
        parallax="subtle"
        blur={{ dim: 0.2 }}
        fadeTo={uiColor('surface')}
        underChrome
        overlay={
          <Toolbar
            label={album.title}
            leading={
              <ToolbarText
                text={album.title}
                description={album.artist}
                size="xlarge"
                headingLevel={2}
              />
            }
            trailing={
              <ToolbarControlGroup
                label="Playback"
                content="mixed"
                material="glass"
              >
                {command(
                  'play',
                  'Play',
                  <LucideIcon icon={Play} name="play" />,
                  true,
                )}
                {command(
                  'shuffle',
                  'Shuffle',
                  <LucideIcon icon={Shuffle} name="shuffle" />,
                )}
              </ToolbarControlGroup>
            }
          />
        }
      >
        <List>
          <section>
            <ListHeader
              label="Songs"
              count={album.tracks.length}
              countLabel={`${String(album.tracks.length)} songs`}
            />
            {album.tracks.map(([title, length], index) => (
              <ListItem
                action="recipe-action"
                itemId={`${album.id}-track-${String(index + 1)}`}
                label={title}
                trailing={
                  <Text variant="span" tone="quiet">
                    {length}
                  </Text>
                }
              />
            ))}
          </section>
        </List>
      </BackdropImage>
    ),
  });

  const views = signal<NavStackView[]>([libraryView(), albumView(ALBUMS[0]!)]);
  const current = () =>
    ALBUMS.find((album) => album.id === views.value.at(-1)?.key);

  const render = () => {
    const album = current();
    return (
      <section data-recipe="recipe-media-detail" aria-label="Music">
        <NavStack
          id="recipe-media"
          label="Music"
          views={views.value}
          chromePresentation="clear"
          scrollEdge="material"
          tint={
            album === undefined
              ? undefined
              : { color: fillColor(album.tint), scheme: 'dark' }
          }
        />
      </section>
    );
  };

  return {
    render,
    action(name, element) {
      if (name === 'nav-back') {
        if (views.value.length > 1) {
          views.value = views.value.slice(0, -1);
          announce('Navigated back');
        }
        return;
      }
      const album = ALBUMS.find(
        (candidate) => candidate.id === element.dataset.itemId,
      );
      if (album) {
        views.value = [...views.value, albumView(album)];
        announce(`Opened ${album.title}`);
        return;
      }
      if (element.dataset.itemId) {
        announce(
          `Playing ${element.querySelector('.kui-list-item__primary-label')?.textContent ?? 'song'}`,
        );
        return;
      }
      announce(`${name} requested`);
    },
    wire(root) {
      // The clear chrome's scroll-edge material and the view Pane's chrome
      // clearance follow the scroll state this reports.
      return wireScrollDividers(root);
    },
  };
};

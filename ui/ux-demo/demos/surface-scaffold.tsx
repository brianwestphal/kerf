import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { remify } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { ListItem } from '@kerfjs/ui/list-item';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { SplitView } from '@kerfjs/ui/split-view';
import {
  DialogSurface,
  PopoverDialogSurface,
  PopupSurface,
} from '@kerfjs/ui/surface-scaffold';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';

const PROJECTS = ['Atlas', 'Borealis', 'Cirrus', 'Delta', 'Ember', 'Fjord'];

/** A list-detail SplitView that fills whichever surface it is given. */
function projectSplit(id: string) {
  return (
    <SplitView
      id={id}
      label="Projects"
      listTitle="Projects"
      detailTitle="Atlas"
      listWidth={{ size: 240, maxFraction: 0.4 }}
      list={
        <List>
          {PROJECTS.map((name, index) => (
            <ListItem
              label={name}
              itemId={name}
              action="log-more"
              selected={index === 0}
            />
          ))}
        </List>
      }
      detail={
        <List>
          <ListInsetText>
            Atlas is active. The split fills the surface's full height, and each
            column scrolls on its own.
          </ListInsetText>
        </List>
      }
    />
  );
}

export function SurfaceScaffoldDemo() {
  return (
    <CatalogExampleStack
      label="Surface scaffold demo"
      rootAttributes={{ 'data-demo': 'surface-scaffold' }}
    >
      <CatalogExample label="Medium dialog" align="inline-control">
        <DialogSurface
          size="medium"
          presentation="modal"
          bodyInset="none"
          footerInset="comfortable"
        >
          <wa-button data-action="show-wa-dialog">Open Dialog</wa-button>
          <wa-dialog id="catalog-wa-dialog" label="Edit workspace">
            <List>
              <ListInsetText>
                Dialog content uses list-owned item geometry.
              </ListInsetText>
            </List>
            <wa-button slot="footer" data-action="hide-wa-dialog">
              Cancel
            </wa-button>
            <wa-button
              slot="footer"
              variant="brand"
              data-action="hide-wa-dialog"
            >
              Save
            </wa-button>
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Viewport-bounded modal"
        note="An 832px preferred width overrides the large preset; an 8px gutter and viewport height cap keep it on phones."
        align="inline-control"
      >
        <DialogSurface
          size="large"
          preferredWidth={remify(832)}
          viewportGutter={remify(8)}
          maxHeight="viewport"
          bodyInset="none"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id="catalog-bounded-dialog"
          >
            Open Bounded Dialog
          </wa-button>
          <wa-dialog id="catalog-bounded-dialog" label="Close workspace">
            <List>
              <ListInsetText>
                Closing this workspace stops its running tasks. Saved files
                remain available when you reopen it.
              </ListInsetText>
              <ListInsetText>
                Review your changes before stopping the workspace. Unsaved
                terminal output will be lost.
              </ListInsetText>
            </List>
            <wa-button
              slot="footer"
              data-action="hide-wa-dialog"
              data-dialog-id="catalog-bounded-dialog"
            >
              Keep Working
            </wa-button>
            <wa-button
              slot="footer"
              variant="brand"
              data-action="hide-wa-dialog"
              data-dialog-id="catalog-bounded-dialog"
            >
              Stop and Close
            </wa-button>
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Capped modal"
        note="A 480px preferred width and typed 360px maximum stay viewport-bounded while the footer remains outside the scrolling body."
        align="inline-control"
      >
        <DialogSurface
          preferredWidth={remify(480)}
          viewportGutter={remify(8)}
          maxHeight={remify(360)}
          bodyInset="none"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id="catalog-capped-dialog"
          >
            Open Capped Dialog
          </wa-button>
          <wa-dialog
            id="catalog-capped-dialog"
            label="Review workspace changes"
          >
            <List>
              {[
                'Saved files remain available.',
                'Running tasks will stop.',
                'Terminal sessions will close.',
                'Unsaved output will be lost.',
                'Background synchronization will stop.',
                'Reopen the workspace to resume your work.',
              ].map((copy) => (
                <ListInsetText>{copy}</ListInsetText>
              ))}
            </List>
            <wa-button
              slot="footer"
              data-action="hide-wa-dialog"
              data-dialog-id="catalog-capped-dialog"
            >
              Cancel Review
            </wa-button>
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Filled list-detail modal"
        note='height gives the modal a definite, viewport-bounded size and bodyLayout="fill" hands the whole body to one SplitView.'
        align="inline-control"
      >
        <DialogSurface
          size="large"
          viewportGutter={remify(8)}
          height={remify(480)}
          bodyInset="none"
          bodyLayout="fill"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id="catalog-filled-dialog"
          >
            Open Project Details
          </wa-button>
          <wa-dialog id="catalog-filled-dialog" label="Project details">
            {projectSplit('catalog-filled-dialog-split')}
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Non-modal popover dialog"
        note="A native popover: it light-dismisses on Escape or a press outside and leaves the page interactive."
        align="inline-control"
      >
        <ToolbarControlGroup single>
          <button type="button" popoverTarget="catalog-popover-dialog">
            Open Repository Status
          </button>
        </ToolbarControlGroup>
        <PopoverDialogSurface
          id="catalog-popover-dialog"
          label="Repository Status"
          preferredWidth={remify(720)}
          height={remify(420)}
          viewportGutter={remify(8)}
          bodyLayout="fill"
        >
          {projectSplit('catalog-popover-dialog-split')}
        </PopoverDialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Embedded popover dialog"
        note='presentation="embedded" shows the same surface in flow, for a catalog or an inline preview.'
        align="inline-control"
      >
        <PopoverDialogSurface
          label="Repository status preview"
          presentation="embedded"
          preferredWidth={remify(560)}
          height={remify(280)}
          bodyLayout="fill"
        >
          {projectSplit('catalog-embedded-dialog-split')}
        </PopoverDialogSurface>
      </CatalogExample>
      <CatalogExample label="Zero-inset list popup" align="inline-control">
        <PopupSurface inset="list-zero">
          <PopupMenu
            text="Choose View"
            items={[{ label: 'Inbox' }, { label: 'Archive' }]}
          />
        </PopupSurface>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

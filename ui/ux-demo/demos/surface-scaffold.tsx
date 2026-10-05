import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { remify } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { DialogSurface, PopupSurface } from '@kerfjs/ui/surface-scaffold';

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
          <wa-button data-action="show-wa-dialog">Open dialog</wa-button>
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
        note="An 8px gutter and viewport height cap keep a modal on phones; the application still owns its content layout."
        align="inline-control"
      >
        <DialogSurface
          size="large"
          viewportGutter={remify(8)}
          maxHeight="viewport"
          bodyInset="none"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id="catalog-bounded-dialog"
          >
            Open bounded dialog
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
              Keep working
            </wa-button>
            <wa-button
              slot="footer"
              variant="brand"
              data-action="hide-wa-dialog"
              data-dialog-id="catalog-bounded-dialog"
            >
              Stop and close
            </wa-button>
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Capped modal"
        note="A typed 360px maximum stays bounded by the dynamic viewport and leaves footer actions outside the scrolling body."
        align="inline-control"
      >
        <DialogSurface
          viewportGutter={remify(8)}
          maxHeight={remify(360)}
          bodyInset="none"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id="catalog-capped-dialog"
          >
            Open capped dialog
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
              Cancel review
            </wa-button>
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample label="Zero-inset list popup" align="inline-control">
        <PopupSurface inset="list-zero">
          <PopupMenu
            text="Choose view"
            items={[{ label: 'Inbox' }, { label: 'Archive' }]}
          />
        </PopupSurface>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

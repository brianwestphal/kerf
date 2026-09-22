import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
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
          bodyInset="compact"
          footerInset="comfortable"
        >
          <wa-button data-action="show-wa-dialog">Open dialog</wa-button>
          <wa-dialog id="catalog-wa-dialog" label="Edit workspace">
            <p>Dialog content uses the compact body inset.</p>
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
      <CatalogExample label="Zero-inset list popup" align="inline-control">
        <PopupSurface inset="list-zero">
          <wa-dropdown>
            <wa-button slot="trigger" with-caret>
              Choose view
            </wa-button>
            <wa-dropdown-item>Inbox</wa-dropdown-item>
            <wa-dropdown-item>Archive</wa-dropdown-item>
          </wa-dropdown>
        </PopupSurface>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

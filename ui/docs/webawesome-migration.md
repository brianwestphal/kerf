# Moving an application off Web Awesome

Kerf UI no longer needs Web Awesome. Every Kerf component renders native
elements and reads only `--kui-*` tokens, so an application built only from
Kerf components installs nothing else. Web Awesome remains an optional
[integration](./component-selection.md#web-awesome-integration) for an
application that wants one of its specialized elements.

This guide moves an existing application from the Web Awesome elements Kerf
now replaces to the Kerf components, then, if nothing else needs it, removes
Web Awesome entirely.

## 1. Replace each element

Work one element type at a time. Each Kerf component takes typed props, emits
standard DOM events, and keeps its state in native form controls, so a
delegated `input` / `change` / `click` handler usually keeps working once the
selector changes.

| Web Awesome markup                                            | Kerf replacement                                                                                                                                                            | Notes                                                                                                                                                                                             |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<wa-button variant="brand">Save</wa-button>`                 | `<Button tone="brand" action="save">Save</Button>` (`@kerfjs/ui/button`)                                                                                                    | `tone` replaces `variant`; `emphasis` replaces `appearance`. Use `href` for a link button, `icon` with `ariaLabel` and no label for an icon-only one, and `pressed` for a toggle.                 |
| `<wa-input label="Name" hint="…" with-clear>`                 | `<TextField label="Name" hint="…" clearable />` (`@kerfjs/ui/text-field`)                                                                                                   | Call `wireTextFields(root)` from `@kerfjs/ui/wire-text-fields` once for the clear button and a live `showCount`. Pass `error` for an invalid field.                                               |
| `<wa-textarea rows="4" resize="auto">`                        | `<TextField multiline rows={4} maxRows={10} />`                                                                                                                             | `maxRows` grows the field with its content up to that height.                                                                                                                                     |
| `<wa-checkbox>Email me</wa-checkbox>`                         | `<Checkbox label="Email me" action="toggle-email" />` (`@kerfjs/ui/checkbox`)                                                                                               | For a mixed parent, pass `indeterminate` and call `wireCheckboxes(root)` from `@kerfjs/ui/wire-checkboxes` once.                                                                                  |
| `<wa-checkbox-group>`                                         | `Checkbox` rows in a `List`, or `ChoiceChips` with `multiple="toggle"`                                                                                                      |                                                                                                                                                                                                   |
| `<wa-radio-group label="Density"><wa-radio value="compact">…` | `<RadioGroup label="Density" name="density" value={density.value} choices={[{ value: 'compact', label: 'Compact' }]} />`                                                    | `@kerfjs/ui/radio-group`. Use `orientation="horizontal"` for a row. Use `SegmentedControl` for a view switch and `ChoiceChips` for wrapping pills.                                                |
| `<wa-switch>Live updates</wa-switch>`                         | `<Switch label="Live updates" checked={live.value} action="toggle-live" />` (`@kerfjs/ui/switch`)                                                                           | Only for a setting that applies immediately; use `Checkbox` for a submitted option.                                                                                                               |
| `<wa-select>` with `<wa-option>` children                     | `<Select label="Status" name="status" value={status.value} choices={[…]} />` (`@kerfjs/ui/select`)                                                                          | Import `@kerfjs/ui/select/register` once. It emits standard `input` and `change` events.                                                                                                          |
| `<wa-dropdown>` with `<wa-dropdown-item>` commands            | `<PopupMenu label="More Actions" icon={…} items={[{ label: 'Archive', action: 'archive' }]} />` (`@kerfjs/ui/popup-menu`)                                                   | Import `@kerfjs/ui/popup-menu/register` once. A dropdown that picks a value becomes a `Select`.                                                                                                   |
| `<wa-dialog label="Edit">` and toggling `open`                | `<DialogSurface id="edit" label="Edit" footer={…}>…</DialogSurface>` with `openDialog(dialog)` / `closeDialog(dialog)`                                                      | From `@kerfjs/ui/surface-scaffold`. The surface is a native `<dialog>`; listen for its native `close` event instead of `wa-after-hide`. Never toggle the `open` attribute.                        |
| `<wa-drawer>`                                                 | `<DialogSurface presentation="side-sheet" …>` (or `"bottom-sheet"`), or `CollapsiblePanel` for a collapsible rail                                                           |                                                                                                                                                                                                   |
| `<wa-tab-group>`, `<wa-tab>`, `<wa-tab-panel>`                | `TabBar` with `wireTabBars` (`@kerfjs/ui/tab-bar`), or `SegmentedControl` for compact local views                                                                           | The application owns its panels.                                                                                                                                                                  |
| `<wa-tag with-remove>`                                        | `<Chip removeAction="remove-tag">Design</Chip>` (`@kerfjs/ui/chip`)                                                                                                         |                                                                                                                                                                                                   |
| `<wa-badge>`, `<wa-spinner>`, `<wa-skeleton>`                 | `Badge`, `LoadingSpinner`, `Skeleton`                                                                                                                                       |                                                                                                                                                                                                   |
| `<wa-icon name="…">`                                          | `<LucideIcon icon={Star} name="star" />` (`@kerfjs/ui/lucide-icon`)                                                                                                         |                                                                                                                                                                                                   |
| `<wa-split-panel>`                                            | `ResizableRegion` with `wireResizableRegions`                                                                                                                               |                                                                                                                                                                                                   |
| `<wa-card>`                                                   | `<ContentItem appearance="surface" frame="framed">` (`@kerfjs/ui/content-item`), or `SunkenPanel` for a lowered region                                                      |                                                                                                                                                                                                   |
| `<wa-page>`                                                   | `Workbench`, `SplitView`, `NavStack`, or `TabNavigator`                                                                                                                     |                                                                                                                                                                                                   |
| `<wa-include src="…">`                                        | `resource()` from `kerfjs/async`, rendering the result as Kerf content                                                                                                      | Never inject fetched markup; it bypasses kerf's `SafeHtml` escaping.                                                                                                                              |
| `<wa-scroller>`                                               | A `Pane` (scroll edges via `wireScrollDividers`) or `ColumnTrack` for a horizontal track                                                                                    |                                                                                                                                                                                                   |
| `<wa-button-group>`                                           | `ToolbarControlGroup` or `SplitButton` for actions, `SegmentedControl` for a choice                                                                                         |                                                                                                                                                                                                   |
| `<wa-progress-bar value="40">`                                | `<progress max="100" value="40">`                                                                                                                                           |                                                                                                                                                                                                   |
| `<wa-popover>`, `<wa-popup>`                                  | `openAnchoredSurface(anchor, render, { label })` (`@kerfjs/ui/anchored-surface`); `positionAnchored()` or `autoReposition()` from `kerfjs/overlay` to place another element | `openAnchoredSurfaceAt` anchors to the pointer.                                                                                                                                                   |
| `<wa-tooltip>`                                                | A native `title` for a plain-text hint                                                                                                                                      | Icon-only toolbar and popup controls already get Kerf help tags. Kerf has no styled general tooltip yet; keep `wa-tooltip` for a rich hover tooltip until it does.                                |
| `<wa-callout>`                                                | `<StateBanner tone="warning" …>` (`@kerfjs/ui/state-banner`)                                                                                                                |                                                                                                                                                                                                   |
| `<wa-toast>`, `<wa-toast-item>`                               | `toast()` from `kerfjs/overlay` with `@kerfjs/ui/overlay-toast.css` imported                                                                                                | Pass `variant` for a tone, a `StateBanner` as the content for a title and detail, and `exitClass: 'kui-toast-exit'` with `exitDuration: 200`. A persistent status stays a `StateBanner` in place. |

Event and selector changes to look for:

- Replace listeners for Web Awesome events (`wa-change`, `wa-input`,
  `wa-show`, `wa-after-hide`) with the standard events the native controls
  emit (`change`, `input`, `toggle`, `close`).
- Replace selectors that name a `wa-*` tag with the component's `data-action`
  or a stable application attribute passed through `rootAttributes`.
- Delete application CSS that styled `wa-*` parts with `::part()`; configure the
  Kerf component through its props instead.

`npx kerf-ui-doctor` and the `eslint-plugin-kerfjs` `recommended-ui` rules flag
remaining `Discouraged` elements.

## 2. Remove Web Awesome

Once no `wa-*` element remains in the application:

1. Delete every `@awesome.me/webawesome/dist/components/…` registration import.
2. Delete the `@kerfjs/ui/webawesome.css` import and any
   `import type {} from "@kerfjs/ui/webawesome"` line.
3. Remove `@awesome.me/webawesome` from `package.json`.
4. Keep `@kerfjs/ui/foundation.css` (or your theme entry). Its tokens fall back
   to the same values the Web Awesome theme gave them, so the application
   renders identically.

If the application keeps a few specialized elements (Tree, Carousel, Rating,
and so on), keep steps 1–3 only for those elements; the integration's theme
bridge keeps them visually consistent with Kerf.

# Accessibility and keyboard contracts

These are normative contracts for package components and consuming applications.

## Shared rules

- All controls have accessible names and visible `:focus-visible` treatment.
- Decorative `LucideIcon` output is `aria-hidden`; pass `label` only when the SVG itself conveys meaning. `size="xs|s|m|l|xl"` selects the 12/16/20/24/32px root-scaled icon steps, and a positive numeric `size` converts pixels to rem; omitting `size` keeps 1em. Size changes the visual only, never the owning control's hit target or accessible name.
- `ListItem` uses native button Enter/Space behavior. `selected` maps to `aria-current="page"`; `pressed` maps to `aria-pressed`. Selected rows keep the normal foreground over their brand-tinted fill so text retains WCAG AA contrast in light and dark themes. Its leading icon visual is 18px while the row retains its 44px minimum target; multiline icons align to the first text line. Its `trailing` content is dormant and must not contain controls. Its `rootAttributes` slot accepts only application `data-*` metadata and deliberately cannot emit `role="menuitem"` in isolation—a true ARIA menu must own arrow, Home/End, Escape, and focus behavior as one widget.
- `ListItemLink` shares that row content and geometry but uses native anchor Enter behavior and requires `href`. It has no `action` or `pressed` state. `external` opens a new tab with `rel="noopener noreferrer"`; the default accessible name announces the new tab for a string label, so an explicit `accessibleLabel` should do the same. Disabled and loading links omit `href`, expose `aria-disabled`, and leave the tab order. Its trailing content remains dormant.
- `ListHeader` owns action naming, disabled state, and disclosure `aria-expanded`. Toggle mode supplies one decorative 18px `DisclosureArrow` when `actionIcon` is omitted; it mirrors `expanded` while the native button's accessible name stays stable. The application must update that controlled state and reveal or hide real content. A valid `count` is visually rendered in an `aria-hidden` neutral pill while the required localized `countLabel` becomes part of the owning heading or disclosure button's accessible name; zero remains a real count. Optional `badge` and `status` content can appear together and should each carry meaningful text. Its narrow `triggerAttributes` slot may describe a native popover or controlled-content relationship with `popoverTarget`, `popoverTargetAction`, `aria-controls`, and `aria-haspopup`; the application owns the target surface and its focus/dismissal behavior.
- Dispose `wireTabBars` and `wireTokenSearchFields` with their owning view. Disposal cancels queued controlled-render focus restoration, so a torn-down view cannot reclaim focus from its successor.
- `wireNavStack` moves focus into every newly active top view and remembers the last focused descendant of each mounted view for pop restoration. Mark a preferred initial heading or control with `data-nav-focus` (and `tabindex="-1"` when it is not normally tabbable); otherwise the helper uses the first enabled focusable descendant, then a programmatically focusable view-container fallback.
- In any `.kui-pane`, menu rows, `ListHeader` actions, and toolbar groups keep a minimum 44px target in both dimensions. A `ListHeader` fills the available inline width and keeps that action at the logical end, including in RTL. Its action visual defaults to 18px through `--kui-list-header-action-icon-size` inside a fitted 36px hover square; a transparent hit layer extends the pointer target to at least 44 × 44 around that square without moving layout or enlarging the painted surface. Compact headers are 36px tall like the rest of the compact List family, so their action target is 44px wide and clamped to the 36px header height instead of reaching into a neighboring row. Do not reduce the target to the visible icon, and do not force the button itself to 44px.
- `LoadingSpinner` is either labeled (`role="img"`) or hidden. Its rotation stops for reduced motion.
- A busy `ToolbarControlGroup` makes its controls inert and exposes `aria-busy`; its `busyLabel` is announced by an adjacent status node outside the inert group. Clear `busy` when the operation finishes so the controls rejoin the focus order.
- A bottom `Toolbar` uses `position="footer"` for footer semantics; top toolbars keep the default `header`. Workbench's main bottom toolbar sets this automatically.
- Interactive `ContentItem` cards are keyboard reachable. Set `selectionMode="toggle"` for a pressed button, `selectionMode="single"` for an option inside a listbox, or `selectionMode="multiple"` for a selectable row with a gridcell that can contain native controls. Place multiple-mode rows inside a labeled `List` or `Grid` with `selectionMode="multiple"`; the app owns the selection set and range gestures. Wire `wireContentItems` once so Enter and Space on the card activate its delegated action without activating it from a nested control. Disabled cards expose `aria-disabled` and leave the Tab order.
- An unlabeled `Skeleton` (including the value slots a component's `placeholder` prop renders) is decorative loading chrome: it is `aria-hidden`, conveys no information a user needs to act on, and is deliberately exempt from the WCAG 3:1 non-text-contrast target. Inside a solid `Badge` it stays subtle (about 2.1–4.4:1 in light, 2.4–2.8:1 in dark, depending on tone); `tests/browser/tone-contrast.spec.ts` holds those values as a regression floor rather than an accessibility threshold. Announce loading through a labeled `Skeleton`, `LoadingSpinner`, or `aria-busy` on the owning region, never through the skeleton's visibility.
- `StateBanner` defaults to polite `role="status"`; use `urgency="alert"` only for an attention-requiring failure. Its optional `badge` is persistent inline status/count content beside the title and is announced as part of the banner; keep it terse and do not rely on color alone for its meaning.
- A removable `Chip` has a native button with a specific `removeLabel`, such as "Remove Urgent tag". The button is absent for a plain chip and disabled for a disabled chip. Its leading `icon` is decorative; the visible label names the tag. `truncate` retains the full plain-text label as a native tooltip. Tag text remains visible because tone does not convey meaning alone. A link `Chip` (`href`) is a native anchor named by its visible label, with no remove button; `external` adds `target="_blank"`, `rel="noopener noreferrer"`, and an "(opens in new tab)" name suffix for a text label, and a disabled link chip drops `href`, sets `aria-disabled`, and leaves the tab order. `tone="inherit"` paints no fill, so its label keeps the surrounding text's contrast (a brand-loud bubble's white text included), and its focus ring is drawn in the surrounding foreground so it stays visible on a brand-colored surface. An action `Chip` (`action`) is one native `<button type="button">` with no nested control: its visible label names it unless `actionLabel` supplies a fuller name, which should contain that label ("Insert filter is:mine"). Enter and Space activate it, keyboard focus draws the focus ring (in the surrounding foreground for `tone="inherit"`), and a disabled action chip is a disabled button that leaves the tab order.
- `EmptyState` reports busy state through `aria-busy` and never relies on an illustration as its label.
- `Select` follows the Web Awesome host's standard `input`/`change` events. Application tests verify the live `value`, focus, and events—not attributes alone. Its decorative option icons and value-dependent selected content remain present after controlled rerenders, so the visible choice does not silently lose its non-text cue.
- `DisclosureArrow` is an 18px root-scaled decorative visual by default, not an interaction target. Its owning native control supplies a stable accessible name, pointer and keyboard interaction, and `aria-expanded`; multiple arrows keep independently controlled state. Consumers may resize it with the typed `size` prop without changing that ownership. Configured directions animate over the shortest path; a 180-degree closed-to-open tie uses counterclockwise rotation.
- `List` is layout-only by default and adds no `list` role. With `selectionMode="multiple"` and a required `ariaLabel`, it becomes a multi-select grid for `ContentItem` rows. Give a scrollable List a bounded block size, avoid nested scroll owners, and keep focused children visible while scrolling.
- `Grid` is layout-only by default. With `selectionMode="multiple"` and a required `ariaLabel`, it becomes a multi-select grid for `ContentItem` tiles; each tile remains a row with a gridcell, including when the CSS grid wraps.

In a multi-select ContentItem grid, `wireContentItems` moves focus between
enabled rows on Up/Down and to the first/last enabled row on Home/End. Native
controls inside a row retain those keys. In a `Grid`, Left/Right moves between
tiles on the same rendered line and Up/Down moves to the nearest tile in the
adjacent rendered line; Home/End reaches the first/last enabled tile. The
navigation reads live geometry, so responsive column changes need no rewiring.
The application changes selection
on card activation and handles its own Shift/Cmd range gestures.
With delegated click actions, use `isContentItemActivation(event, card)` in the
card's selection handler so a nested menu trigger or other control does not
also select the card.

## Select

Supply a visible `label`, or `ariaLabel` when the surrounding interface already
provides visual context. A nonempty `label` takes precedence when both are
supplied. Kerf forwards that name through Web Awesome's internal label contract;
an `aria-label` on the custom-element host alone cannot name its shadow
combobox. With `ariaLabel` alone, Kerf visually hides the internal label without
adding height or spacing. This also applies to `renderSelected`: selected content
stays separate from the control's stable accessible name. Applications do not
need shadow-DOM patches or extra label styling.

Set `multiple` (with an array `value`) to let the person choose any number
of choices. The popup stays open while they toggle choices with the pointer,
Enter, or Space, and closes on an outside press, Escape, or focus leaving,
returning focus to the combobox. The listbox is `aria-multiselectable`, each
chosen option shows its check, and the closed control reads the chosen labels
in choice order as one short localized list (the `placeholderText` when none
are chosen) instead of a removable tag per choice. `change` and `input` report
the value array; in a form, every chosen value is submitted under `name`.
Disabled choices remain visible with `aria-disabled` and cannot be selected;
`disabledReason` adds a native tooltip. For a multiple Select, opt-in
`selectAllLabel` and `clearLabel` render named footer buttons. They keep the
popup open, select only enabled choices or clear the selection, and emit the
ordinary `input` and `change` events only when the value changes. Their labels
come from the application so they can be localized.

A toolbar filter menu (a "Filter by label" funnel) is a multiple Select with
`selectedPresentation="icon-only"` and a fixed `triggerIcon`; the types accept
`triggerIcon` only there, and require it there, because no single chosen
choice has an icon to show. The trigger keeps the icon-only pill geometry
below: the fixed icon, then, while any choice is chosen, a compact brand
`Badge` with the count 4px after it, then the caret. The badge is hidden from
assistive technology; instead the combobox's accessible name ends with the
chosen labels in choice order ("Filter by label: Bug, Docs", just "Filter by
label" when none are chosen), and its hidden value text stays empty so screen
readers do not announce the list twice. With a visible `label` the same summary
reads in the label, standing in for the hidden value.

Use `presentation="toolbar-borderless"` inside a `ToolbarControlGroup`, with
`size="compact"` in a compact group; set `focusRingOwner="group"` when that
parent paints the composed focus ring. `selectedPresentation="icon-only"` hides
only the visible selected label—the required `label` or `ariaLabel` still names
the combobox. An icon-only trigger keeps its disclosure caret: the selected icon
and caret form one pill with the same geometry as a `PopupMenu`
trigger (8px inline padding on both sides, 12px from the icon to the caret, a
40px default or 32px compact control height), so the caret still signals a
choice list. Inside a group the trigger is inset evenly on every side (2px in a
default group, 1px in a compact one) with a concentric radius; the group grows
to the trigger's width, so a single group is wider than it is tall and its
focus ring follows the pill while focused. While the listbox is open the
trigger drops its ring, as a `PopupMenu` trigger does: the open popup and its
current option show where focus is, and the ring returns when the listbox
closes with focus still on the control. A group that owns the ring
(`focusRing="outline"` or `"halo"`) drops it the same way while a Select
listbox or `PopupMenu` inside the group is open.
Beside other controls in one group, the icon-only trigger is one more segment:
it keeps the group's gap and its siblings' block inset, height, item radius,
and hover pill. In a group with per-control rings (`focusRing="control"`, the
default) it paints the same ring as its sibling buttons, even when
`focusRingOwner="group"` was set, because no group ring would show focus.
Navigation selects can use intrinsic `presentation="navigation"` plus
`labelMaxWidth` for component-owned ellipsis. These props own the control's
appearance; its parent continues to own outer placement.

Use `presentation="inline"` with a single-value `renderSelected` when the
selected content, such as a `Badge`, already provides the trigger chrome. The
closed combobox has no minimum height, inline padding, or border width, so the
rendered content defines its box. The Select still owns the focus ring,
accessible combobox name, and listbox interaction; keep `label` or `ariaLabel`
even when the selected content shows its own short text.

Use `hint` for persistent supporting text below the control; use
`placeholderText` only for the empty value shown inside the closed control.
The hint renders below the control and is the trigger's `aria-description`. The
accessible control is the light-DOM trigger button (`role="combobox"`), not the
`kui-select` root; inspect or test the element returned by the `combobox` role.
Loading placeholders keep the same visible hint while replacing the interactive
control with inert chrome.

`tests/unit/components.test.tsx` covers name projection and visible/hidden label
variants. `tests/browser/select-accessibility.spec.ts` verifies actual accessible
names, unchanged unlabeled geometry, keyboard selection, controlled rerenders,
hint wiring, and wide/narrow presentation in Chromium, Firefox, and WebKit.

The explicit `@kerfjs/ui/select/register` import defines the form-associated
`kui-select` root and wires every Select in the document. The trigger opens the
listbox (`role="listbox"`, `aria-multiselectable` when `multiple`) as a manual
popover in the top layer, below the trigger and flipping above when short, with
focus on the chosen option. In the listbox the arrow keys move and wrap,
Home/End jump, typing a label's first letters moves to it, and Enter or Space
chooses; a single Select then closes and returns focus to the trigger, while a
multiple Select stays open. Escape closes and returns focus to the trigger; Tab
and an outside press close it. Options are `role="option"` elements with
`aria-selected` and, for a disabled choice, `aria-disabled`; the template
renders them, so a re-render keeps them. `tests/unit/select-controller.test.tsx`
covers the keyboard, choice, and form contracts;
`tests/browser/select-lifecycle.spec.ts` repeats open/close/resize/reopen
sequences at wide and narrow widths in Chromium, Firefox, and WebKit.

### Help tags on icon-only triggers

An icon-only control has no visible title, so sighted pointer and keyboard users
would otherwise see only its icon (and a filter's count). Following the Apple
HIG convention for toolbar items, three kinds of icon-only control show a help
tag: a Web Awesome `wa-tooltip` in the theme's tooltip palette, below the
control.

- an icon-only `Select` (`selectedPresentation="icon-only"`, single or
  `multiple`);
- an icon-only `PopupMenu` (named by `label` rather than visible `text`);
- an icon-only `<button>` or link (`<a href>`) inside a `ToolbarControlGroup`,
  named by a non-empty `aria-label`, with no visible text, no native `title`,
  and no Web Awesome tooltip `for` it.

Tags are on by default and take no props. One document-level installer covers
all three kinds, and any of `@kerfjs/ui/select/register`,
`@kerfjs/ui/popup-menu/register`, or `@kerfjs/ui/help-tags/register` installs
it (once per document, however many are imported). An application whose
toolbars have icon-only buttons but no registered `Select` or `PopupMenu`
imports `@kerfjs/ui/help-tags/register`, which installs only the help tags.
The tag is Kerf's own element (no Web Awesome): one `aria-hidden`,
`popover="manual"` element in the top layer, placed 8px below its trigger
(flipping above when short, kept 8px clear of the viewport edge), styled by a
zero-specificity stylesheet the installer adopts so a theme can restyle it.
Pure `SafeHtml` rendering stays zero-JS: without an installer, nothing shows a
tag.

- **Text.** The tag says what the accessible name says: a filter's name and
  chosen labels ("Filter by label: Bug, Docs", or "Filter by label" when none
  are chosen), a single Select's name and current choice ("Rendering balance:
  Balanced"), a menu's `label` ("Sort tickets"), or a toolbar button's
  `aria-label` ("Pin view"). It updates with the selection.
- **Showing.** It appears after the pointer rests on the control for 500ms, at
  once when a neighboring tag closed moments ago (so scanning along a toolbar
  stays quick, across buttons, Selects, and menus alike), and immediately on
  keyboard focus (`:focus-visible`). A pointer press that focuses the control
  and touch input never show it.
- **Hiding.** It hides when the pointer and keyboard focus have both left the
  control, on a press, on Escape, and whenever a popup opens. It does not come
  back when the popup closes and focus returns to the trigger, or while the
  pointer stays on a pressed button; it returns after the pointer moves onto
  something else or focus leaves and comes back.
- **Assistive technology.** The tag is `aria-hidden` and never joins the
  control's `aria-labelledby` or `aria-describedby` (kerf anchors it directly
  rather than through `for`), so the accessible name is unchanged and announced
  once; the accessibility tree is identical with the tag open or closed.
- **Isolation.** A Select's or PopupMenu's tag lives in the control's own
  shadow root, so the morph never touches it and light-DOM `:has([open])`
  selectors do not see it. A plain button cannot host a shadow root, so its tag
  lives in one `aria-hidden`, `data-morph-skip` layer at the end of `<body>`
  (fixed and zero-sized, so it never joins a grid or flex body's flow, and
  re-attached if a body re-render drops it) and leaves that layer once hidden.
  It copies the button's `color-scheme`, so it matches a subtree theme, and its
  popup renders in the browser's top layer, so it shows above a modal dialog
  that holds the button. Tags' `wa-show` / `wa-hide` lifecycle events stop at
  the tag, so a listener on the control (or a delegated one above it) hears only
  the popup; a document capture-phase listener still observes them. A long tag
  wraps at the tooltip's maximum width and keeps 8px clear of the viewport
  edge.

A labeled Select, a `PopupMenu` with visible `text`, and a toolbar button with
visible text get no tag: their visible text already names them. A button that
carries a native `title`, or that the application has already given a
`wa-tooltip` `for` its `id`, keeps that and gets no second tag, so nothing is
shown twice. Zero-JS components that name an icon control with a native `title`
(the `ListHeader` action, the `AppTab` close button, the `TokenSearchField`
reveal and clear buttons, and `SegmentedControl` choice titles) keep the
browser's own tooltip, which needs no script; the installer deliberately skips
them rather than stacking a second tag on the first. Icon-only buttons outside
a `ToolbarControlGroup` are application markup and keep whatever naming the
application gives them.
`tests/unit/help-tag.test.ts` walks the hover, focus, press, Escape, popup, and
warm-window transitions for every kind; `tests/browser/select-help-tag.spec.ts`
and `tests/browser/toolbar-help-tag.spec.ts` check the real elements in
Chromium.

## PopupMenu

`PopupMenu` is Kerf's own menu: a native trigger `<button>` and a `role="menu"`
panel that opens as a manual popover in the top layer, wired by
`@kerfjs/ui/popup-menu/register`. The trigger carries `aria-haspopup="menu"`
and an `aria-expanded` that follows the menu. An icon-only trigger requires
`label`, which renders as visually hidden text inside the button; a trigger
with visible `text` is named by that text. An icon-only trigger also shows its
`label` as an `aria-hidden` help tag on hover and keyboard focus (see
[Help tags on icon-only triggers](#help-tags-on-icon-only-triggers)).
The open menu carries that same name as its `aria-label` (a context or
icon-only `label`, or the visible `text`), and each submenu panel is named by
its parent item's label, so it is announced as, for example, "More Actions,
menu". `tests/browser/popup-menu-accessible-name.spec.ts` finds each panel with
`getByRole('menu', { name })` in Chromium, Firefox, and WebKit.

Items are `menuitem` (or `menuitemcheckbox`, with `aria-checked`) buttons;
a disabled item keeps `aria-disabled="true"`, stays in the menu, is skipped by
the arrow keys, and cannot be chosen (its click never reaches the
application's `data-action`). Disable the whole trigger only when every command
is unavailable. A heading names the `role="group"` that holds the items under
it and is itself hidden from assistive technology, so its words are announced
once; dividers are `role="separator"`. A keyboard-focused item is the menu's
current row, painted with the Select's current-option fill rather than a second
focus ring inside the open popup.

The keyboard follows the menu-button pattern. Enter, Space, or ArrowDown on the
trigger opens the menu on its first item, and ArrowUp on its last. ArrowUp and
ArrowDown move and wrap, Home and End jump, and typing the first letters of a
label moves to it. Enter or Space chooses the current item; a choice closes the
menu and returns focus to the trigger. ArrowRight opens a submenu on its first
item and ArrowLeft returns to the parent item (mirrored right to left); a key
pressed while a submenu is still fading in lands on the item it names. Escape
closes the current level and returns focus to its opener, so an enclosing
dialog stays open; Tab closes the menu and continues from the trigger. A press
anywhere outside an open menu closes it, including a context menu opened by
that same press.

Hovering an item that has a submenu opens it. While a pointer-opened submenu
is showing, a "safe triangle" from the pointer to the submenu's near edge keeps
a diagonal move toward the submenu from closing it as the pointer crosses the
parent's other rows; moving onto another item of the parent closes it after a
short grace period. Set `checked` to `true` or `false` for checkbox menu
semantics; omit it for a plain command. The application owns that state: a
choice reports the state it asks for in the root's `kui-menu-select` event, and the
menu shows the new state once the application renders it. `details` supplies
optional trailing visual content without changing a command's accessible
label. A `context` menu's invisible anchor is outside the accessibility tree
and normal Tab order; opening the menu moves focus into its commands and Escape
dismisses it. Keep a separate visible row action named even when it is
disabled.

## ListActionRow

`ListActionRow` renders a noninteractive visual root containing primary and
trailing native buttons as siblings. The primary comes first in DOM and Tab
order and alone receives `aria-current` or `aria-pressed`; the trailing button
has its own required accessible name and disabled state. Both controls carry
the row's item id for application delegation, while the root deliberately has
no action or role. `label`, `icon`, and `trailingActionIcon` are dormant visual
content and must not contain buttons, links, interactive roles, or other
controls. A trailing click, double click, context menu, Enter, or Space
must never activate the primary control. Selected rows keep the normal
foreground over their brand-tinted fill so text retains WCAG AA contrast in
light and dark themes. The application owns controlled
selection and the lifecycle, focus, and dismissal policy of any related
popover or context menu.

With `trailingMenu`, the trailing control is a `PopupMenu` trigger instead of
the native trailing button: an icon-only Web Awesome button named by
`trailingMenu.label`, announced with `aria-haspopup="menu"` and
`aria-expanded`, in the same primary-then-trailing order. Opening it moves
focus to the first command; Escape or a choice closes the menu and returns
focus to the trigger. An interaction-revealed trigger stays visible while its
menu is open. A pointer opening through `openPopupMenuAt` (for example from
the row's `contextmenu`) keeps the same keyboard and dismissal behavior.

## Reorderable list rows

A `draggable` `ListItem`, `ListItemLink`, or `ListActionRow` is a native HTML
drag source (a `ListActionRow` is dragged by its noninteractive root, so its two
buttons keep their own activation). Pointer dragging is never the only way to
reorder: `wireListReorder()` moves the focused row (or, when it is selected or
pressed, every selected row of its list) with Alt+Shift+ArrowUp and
Alt+Shift+ArrowDown, and returns focus to the moved row's focusable control
after the application re-renders. The dragged rows dim and the drop target
draws a 2px brand insertion line (system `Highlight` in forced colors), so the
landing position never relies on color alone. A loading placeholder is never
draggable. The application owns order, selection, and any announcement of the
completed move.

## ResizableRegion

Set `responsiveFillAt="narrow"` or `"compact"` when a responsive composition
shows the region as its only inline track. The component then owns its
full-width geometry and removes its dormant separator at that container
breakpoint; the application owns which pane is visible.

The handle exposes separator role, orientation, name, minimum, maximum, and current values. `wireResizableRegions()` adds:

- the axis arrow keys in 16 px steps by default;
- Shift+Arrow in 64 px steps;
- Home and End for minimum and maximum;
- primary-pointer drag with clamping;
- a visible maximum: when a parent clamps the track below the requested size
  (a `max-width` stage, a narrow container), pointer and keyboard resizing stop
  at the size actually shown, and the handle announces that size in
  `aria-valuenow` and that bound in `aria-valuemax`. Focusing the handle
  reports a stale larger committed size as the shown size without committing
  it, so the first key press moves the visible separator. The reported values
  also stay current at rest: a `ResizeObserver` on each region and its parent
  re-clamps them when the space changes, and a `MutationObserver` re-clamps
  them after a re-render writes the rendered props back, so assistive
  technology never reads an unclamped size between interactions (the
  disposer disconnects both observers);
- a truthful value below the minimum: when the container shows the track at
  less than `min` (a narrowing `Workbench` squeezes its resizable rails), the
  handle reports that shown size in `aria-valuenow` and pins `aria-valuemin`
  and `aria-valuemax` to it — WAI-ARIA requires the value to lie inside the
  range, and the separator cannot move a track its container holds. A pinned
  separator — squeezed, or with a reachable range collapsed to one size —
  commits nothing: arrow keys, Home/End, and drags leave the app's size (and
  its storage) as it was, so the track returns to it, with the rendered range,
  once it has room;
- a whole hit target and focus ring at a clamped edge: when the separator has
  less room past it than the handle's 10px overhang (a parent clamps the track
  to its own edge), the region carries `data-handle-inset` and the handle sits
  wholly inside it, so a clipping ancestor cannot cut off half the handle or
  its focus ring. The ring is drawn inside the handle's box, so the region's
  ends meeting a clipping edge never shave it either;
- preview callbacks while dragging and one commit callback on release;
- a live size that also resizes slide-motion content, so the content tracks the
  separator during a drag or key press instead of waiting for the app to
  re-render the committed size.

The application owns persistence and collapsed/expanded policy. Keep the last expanded size outside the component and restore it when reopening. An optional `handleIcon` replaces only decorative dormant content; it must not contain controls or interactive roles because the separator remains the sole focus and interaction owner.

## Toolbar headings

For headings and paragraphs outside toolbar identity/title zones, use `Text`.
It renders the selected native `h1`–`h6` or `p` element, so heading navigation
follows the variant directly; choose a level that preserves the document
outline. Native global, `data-*`, and `aria-*` attributes pass through.

Compose panel, dialog, and page headings as a plain `Toolbar`. Its leading zone
holds an optional icon `ToolbarControlGroup` and a direct extra-large
`ToolbarText`; controls belong in a trailing `ToolbarControlGroup`. By default
the title carries no native heading role, so for a **dialog or panel** the
application connects the title id and optional supporting-copy id to the owning
host through `aria-labelledby` and `aria-describedby`. For a **page or view**
title, pass `headingLevel` (usually `1`) to `ToolbarText`: it then exposes
`role="heading"` with a matching `aria-level`, giving the view a heading landmark
so screen-reader heading navigation and "main heading" semantics work — the same
role/level pair used throughout Kerf UI. Keep the levels meaningful and
non-skipping within a view. Pass trailing
controls as a labeled `ToolbarControlGroup` when that group needs an accessible
name. A short supporting line belongs in the title's `description`: with it,
`id` and `headingLevel` move to the title span, so `aria-labelledby` names only
the title, and `descriptionId` gives the description its own id for
`aria-describedby`. Keep longer supporting copy as app-owned content below the
toolbar.
An editable title can use `ToolbarText action="edit-title"`; it renders a native
button whose full text remains its accessible name even when visually truncated.
Click, Enter, and Space activate the delegated action. The app owns the input
shown while editing and its focus lifecycle. Because the button cannot also be
a heading landmark, expose a heading elsewhere when the view needs one.

## FloatingToolbar

`FloatingToolbar` is a `role="toolbar"` region with a **required** accessible
`label`; it floats over the content of its nearest positioned ancestor and is
forced to a dark color scheme, but it is **not** in the top layer, so it never
covers dialogs, popovers, or other overlays. Its children are the app's controls
(normally `ToolbarControlGroup`s), which keep their own names, focus, and
keyboard behavior; the application owns their actions, the toolbar's visibility,
and — via `position` and the typed `inset` prop — where it sits. Inside a `Workbench`, `CollapsiblePanel`, or
`ResizableRegion` `restoreControl` the restore corner owns the inset, so the
toolbar floats from that corner. While one of those layouts has a side overlay
open over the toolbar's region (a Workbench rail overlay, a `wireSidebar`
compact overlay, an overlay `CollapsiblePanel` or horizontal
`ResizableRegion`), the toolbar is hidden (`visibility: hidden`), so it is
unfocusable and out of the accessibility tree rather than a control stranded
behind the overlay's focus trap; it returns when the overlay closes. The
overlay's own floating toolbars stay.

## Tabs

`AppTab` renders one controlled tab. `TabBar` supplies the containing tab list,
fixed leading/trailing/end regions, and a horizontally scrollable strip.
Use `TabBar.presentation` for rail, segmented, or inspector chrome,
`allocation="fill"` when peers should divide the strip, and
`trailingPlacement="adjacent"` when an action belongs beside the final tab.
When that local action must coexist with a workspace-level action, put the
workspace action in `end`; TabBar keeps the adjacent action immediately after
the shrinkable/scrolling tabs and pins `end` at the far edge. Leading,
trailing, and end actions remain visible and do not shrink. The component owns
that geometry; applications must not override its anatomy to create the split.
`trailing` and `end` each accept one `ToolbarControlGroup` for grouped controls
or one standalone `Button` when a primary action needs its own chrome. Do not add a wrapper or flex margins to position the action.
`AppTab` provides compact 32px, segmented, truncating-label, and icon-only
presentations. Icon-only tabs keep the required `name` as the tab button's
accessible name while visually hiding the duplicate label. The default name
overflow is an ellipsis; `nameOverflow="visible"` lets an inline loading
treatment show the whole name, without changing the accessible name. The app
sets `dropTarget` during a content drag-over to paint a brand highlight;
selection and tab focus stay independent of that visual state. A `pending` tab (known,
still opening) keeps its visible name as the tab button's accessible name, so a
trailing spinner's own label is not folded into it. It is `aria-busy` and stays
selectable (in the roving tab order like a live tab), so the application can
show placeholder content in its panel until loading completes; its close
button is disabled and hidden and it is not draggable. A `placeholder` tab
(unknown) is instead disabled, out of the tab order, and not draggable. These props own
component appearance only; the application still owns the bar's outer placement.
`AppTab.rootAttributes` accepts application `data-*` metadata only; runtime
filtering rejects roles plus case variants of component- or wiring-owned
action, identity, selection, drag, drop, and component attributes. An optional
`closeIcon` is decorative dormant content inside the already named close button
and must not contain interactive descendants.
The first `AppTab` can set `pinned` to stay at the inline start while its peers
scroll. It remains a normal tab within the same tablist and roving-focus order;
focus and controlled selection reveal peers beyond the pinned tab. Pin only the
leading tab of a strip.
WebKit currently moves a pinned tab outside an RTL strip as it scrolls;
`KF-MYFQAS` tracks the browser correction.
`wireTabBars()` adds Left/Right wrapping, Home/End, Delete/Backspace close
activation, same-bar pointer reordering, `Alt+Shift+ArrowLeft/ArrowRight`
reordering, focus restoration, scroll-into-view, and pointer-proximity
autoscroll at either horizontal edge. Edge autoscroll is direct manipulation,
stops on drop/drag end/disposal, and does not change keyboard behavior. When
the application changes a bar's selected tab without focus (adding and
selecting a tab), the wiring scrolls that tab's strip — never the page — so
the new selection is fully visible; a re-render that keeps the same selection
leaves a strip the user scrolled where it is. It returns a disposer.

Arrow / Home / End follow the ARIA Tabs **automatic-activation** pattern by
default: they move roving focus and select the focused tab. If selection synchronously
replaces the strip, focus returns to the replacement with the same bar and tab IDs. Pass
`activation: 'manual'` (or set `data-tab-activation="manual"` on a strip via the
`TabBar` `activation` prop, which overrides the option per bar) for
**manual activation**: arrow keys move roving focus only and the user selects
with Enter / Space (native on the tab button) or click. Use manual activation
when selecting a tab is a heavy or side-effecting action — e.g. a tab that loads
a project — so arrowing through the strip does not trigger it on every tab.

The application owns the ordered tab array, selection, panels, close policy,
routing, and persistence. On `onReorder`, synchronously render the reported
order so the helper can restore focus to the moved tab. Pair tabs with
`tabpanel` elements and keep exactly one selected tab at `tabindex="0"`.

## SegmentedControl

`SegmentedControl` labels its native-button group and projects the controlled
selection through both `aria-pressed` and `data-selected`. Every enabled choice
stays in sequential Tab order, matching Hot Sheet 2's compact view and inspector
controls; Enter and Space use native button activation. The application handles
the supplied `data-action`, reads `data-segment-value`, updates `value`, and
re-renders. Keep labels unique and meaningful even when `content` shows only an
icon. The filled track uses the normal neutral text role for readable unselected
labels in light and dark themes. Use tabs—not a segmented control—when choices switch page regions that
need `tab`/`tabpanel` semantics.

## ChoiceChips

`ChoiceChips` renders `role="radiogroup"`, named by `label` (`aria-label`) or
by `labelledBy` (`aria-labelledby`, typically a visible `FieldLabel`). Each
choice is a native `<input type="radio">` inside its pill `<label>`, so the
browser owns the interaction: the group is a single Tab stop on the checked
radio (or the first enabled one when nothing is selected), arrow keys move and
select, Space selects, and the checked radio submits its value under `name`.
`required` makes an unselected group fail native form validation, and
`disabled` (group) or a choice's `disabled` removes it from interaction. The
radio's accessible name is the visible label; a `swatch` or `icon` is
`aria-hidden` decoration. The focus ring is drawn on the pill around the
focused radio, and the checked pill adds a second pixel of border so the
selection does not rely on hue alone; forced-colors mode paints it with
`Highlight`.

With `multiple`, the group renders `role="group"` with the same naming, and
each choice is a native `<input type="checkbox">` inside its pill. Every pill
is its own Tab stop, Space toggles it, assistive technology reads its native
checked state, and every checked box submits its value under `name`
(`FormData.getAll(name)`). Native `required` on a checkbox demands that one
box, so a multiple group takes no `required`; validate an "at least one" rule
in the application. Every chip color is a theme token resolved through
`light-dark()`, so inside a dark appearance scope (`.wa-dark`, `.wa-invert`,
or any `color-scheme: dark` ancestor) the pills, labels, checked tint, and
focus ring read on inverse chrome without overrides.

## TextField

`TextField` renders a native `<input>` (or, with `multiline`, a `<textarea>`)
inside one `<label>`, so a click anywhere on the field focuses it. The input is
named explicitly — `aria-label` from `label`, whose visible text is
`aria-hidden`, or from `ariaLabel` — so the clear button and the character
count inside the label never join its name. `hint` and `error` are visible
below the field and together form its `aria-description`; `error` also sets
`aria-invalid="true"`, draws the box border in the danger color, and shows the
message in the danger text color, so validity never relies on hue alone.
`required`, `disabled`, `readOnly`, `maxLength`, `type`, and `autocomplete`
are native attributes. A required field shows an `aria-hidden` asterisk after
its label; the input itself reports `required`. The focus ring is drawn on the
box around the input (`:focus-within`), 3px with a 1px offset like every Kerf
control.

`clearable` adds a native `<button>` named by `clearLabel` (default "Clear")
after the input. It is hidden while the field is empty, is a normal Tab stop,
and with `wireTextFields(root)` empties the field, dispatches bubbling `input`
and `change` events as typing would, and returns focus to the field. A
disabled or read-only field's clear button is disabled. `showCount` (with
`maxLength`) shows a live `count / maxLength` beside the hint that
`wireTextFields` keeps current. Compact text grows to 16px on coarse-pointer
touch screens so focusing a field never zooms the page in iOS.

## Checkbox, RadioGroup, and Switch

Each control is a native input inside its `<label>`, positioned invisibly over
an `aria-hidden` drawn box, circle, or track. The label names it, and pointer,
keyboard, touch exploration, and form submission all reach the real input.
Keyboard focus draws the 3px focus ring with a 1px offset on the drawn shape;
forced-colors mode paints checked state with `Highlight`.

- `Checkbox` is an `<input type="checkbox">`; Space toggles it. `hint` and
  `error` form its `aria-description`, and `error` sets `aria-invalid="true"`
  and a danger border. `indeterminate` renders a `data-indeterminate` marker
  that `wireCheckboxes(root)` turns into the native `indeterminate` property
  (the only way to set it), so assistive technology reports a mixed state; a
  click clears it natively and the app's next render decides it again.
- `RadioGroup` is a `<fieldset role="radiogroup">` named by its `<legend>`
  (`label`) or `ariaLabel`. The browser owns the interaction: one Tab stop,
  arrow keys move and select (skipping disabled choices), and the checked
  radio submits its value under `name`. The group's `hint` and `error` form
  its `aria-description`; `error` sets `aria-invalid` on the group, `required`
  sets native `required` on each radio plus `aria-required` on the group, and a
  choice's `hint` is that radio's `aria-description`.
- `Switch` is an `<input type="checkbox" role="switch">`, so assistive
  technology announces on and off; Space toggles it. Its `hint` is its
  `aria-description`. The thumb's slide is skipped when reduced motion is
  preferred. Use it only for a setting that applies immediately.

Hints sit on the label's text column, not under the drawn shape. Safari's
default Tab order skips checkboxes and radios as it does buttons; the
controls keep that platform setting.

## Composer

`Composer`'s message field is a native `<textarea>` named by `label`
(`aria-label`, title style). With an `id`, the `hint` renders with the id
`<id>-hint` and becomes the field's `aria-describedby`; without an `id`, the
hint is visible only. The field draws no border or outline of its own: the
frame is its boundary, and while focus is anywhere within the composer the
frame's border turns brand (`Highlight` in forced-colors mode, with a 2px
outline). Each trailing action keeps its own name and focus ring. `disabled`
disables the field only; the app disables its actions. Sending and
announcing a sent message stay with the app.

With `submitOnEnter` and `wireComposers`, the field carries
`aria-keyshortcuts="Enter"`, so assistive technology announces the shortcut.
Enter and Cmd/Ctrl+Enter activate the first trailing action, the same control
a pointer or Tab-and-Space user reaches; Shift+Enter inserts a newline. An
Enter that commits an IME composition (`isComposing`, keyCode 229, or between
`compositionstart` and `compositionend`) is left to the input method, so
people composing Japanese, Chinese, or Korean text never send a half-written
message. An empty or whitespace-only message, an auto-repeating key, a
disabled field, or a disabled, loading, or `aria-disabled` action sends
nothing. A visible hint may also state the shortcut when the audience may not
expect it.

## TokenSearchField

Use `presentation="form-field"` when a structured search query sits beside
Web Awesome form controls. It renders the visible `label` with the same inset
and typography, an optional `hint`, and an optional `required` marker. The
searchbox references the label and hint with `aria-labelledby` and
`aria-describedby`, and `required` sets `aria-required`; the application
validates the value before submission. `wireTokenSearchFields()` also moves
focus to the editor when the visible label is clicked. The field stands outside
a Toolbar and fills the same inline space as a neighboring `TextField`.
Its control radius and required-marker color and offset follow Web Awesome's
form-control tokens, so the two controls read as one form.

`TokenSearchField` exposes the editable surface as a named `searchbox`. Each
chip is atomic (`contenteditable="false"`) and contains separately named edit
and remove buttons; the clear action is also named. A `trailingAction` is a
named button whose `label` is also its tooltip; a help toggle sets `expanded`
(`aria-expanded`, with `haspopup` and `controls` for the surface it opens) and
an on/off toggle sets `pressed` (`aria-pressed`). Disabled fields publish
`aria-disabled` and stop editing without hiding the current expression. The
application owns query parsing and must announce result-count or loading
changes separately when that feedback is useful. Use `readTokenSearchField()`
to ignore the chip buttons' visible text when reading browser-edited content,
and `placeTokenSearchCaret()` to restore a text caret without landing inside a
chip. Call `wireTokenSearchFields()` once at a stable root so Enter submits
without inserting a contenteditable line break and keyboard chip deletion
restores focus plus the text-relative caret after controlled rendering replaces
the editor. Restoration finishes after synchronous input listeners and before
another keystroke; it does not wait for an animation frame that could overwrite
a later selection. Select All + Backspace/Delete shares that replacement path
and keeps the adopted expanded signal open while managed focus is enabled.
Real outside focus, empty Escape, disposal, and removed fields retain their usual
behavior. The editor still wraps text visually at its inline edge. Editable text is DOM-owned between token changes; a clear handler empties
the editor's `textContent` before updating application state. Leading and
trailing controls share the first text line's fixed vertical center and remain
there as the editor wraps. In `collapsible` mode, the closed state is one named
iconic search button and the open state is the same named searchbox, whether
the field stands alone or is composed inside `ToolbarControlGroup`.

On coarse touch devices, the editor's computed text size has a 16px floor. This
avoids iOS focus magnification of the small-text editor while preserving the
user's ability to pinch zoom; other field chrome and desktop density are unchanged.

For an app-driven query replacement with an unmanaged field, change its
`revision` along with `query` so the editor text rebuilds. For a model-managed
field, call `model.replace({ query, tokens })`: it parses the supplied state and
advances `editorRevision` even when the tokens did not change.

Applications set `expanded` while the field is focused, move focus from the
trigger into the revealed editor, and clear `expanded` only after focus leaves
the complete component. Text or tokens keep the field expanded even when that
transient state is false. Width animation is disabled under reduced motion.
Clearing with ✕ follows where focus was when it was pressed: from inside the
field (the editor, or ✕ reached by keyboard) the caret returns to the emptied
editor; with focus elsewhere, `wireTokenSearchFields` leaves focus where it is
and collapses the emptied field, as it would on blur.

When the field is composed with a caller-owned surface rendered outside it — a
suggestions listbox, date picker, or help popover — mark that surface (or wrap
it) with `data-token-search-keep-open`, or pass `collapsible.keepOpenOn(target)`,
so focus or pointer activation moving into it does not collapse an empty field.
The helper preserves the pointer target when a browser omits
`focusout.relatedTarget`, preventing the field or target from disappearing
between pointerdown and click. For an empty field losing focus during a pointer
press, managed collapse waits until that press's click has dispatched (or the
press ends without a click), then rechecks focus and content before closing.
This keeps a shifting search row from moving the pressed control mid-click.
`wireTokenSearchFields`
can also, opt-in via `keyboard`, own atomic-chip editing keys: from a collapsed
caret with no selection, Backspace removes the token before the caret and Delete
the token after it (reported through `onRemoveToken` for the app to apply to its
controlled state), and ArrowRight moves the caret past a trailing chip so typed
text lands after it. An optional `onEdit({ id, editor, event })` — with the
originating `InputEvent` so a caller can gate on `inputType`/`data` — fires on every editor
`input`, letting a caller drop its own `input` listener; the application still
owns query parsing and result-count/loading announcements. When the app's `onEdit` or `onRemoveToken` changes tokens and the controlled render replaces the focused editor, `wireTokenSearchFields` moves focus and caret to the replacement at the same mutation checkpoint (a caret at the end of the query stays at the end; any other caret keeps its place in the remaining text), so keys typed at full speed are not lost.

With a `createTokenSearchModel` passed to the field and registered in
`wireTokenSearchFields(root, { models })`, grammar parsing, chips, clear/edit/
remove actions, and suggestions are managed. Arrow Down moves from the editor
to suggestions, arrow keys move between suggestions, Enter selects one, and
Escape returns focus to the editor. The application still announces results
when needed and can supply an `evaluate` callback to compute them. Omitting the
model leaves the manual behavior above intact. After a chip commit, suggestion
choice, chip edit, or Backspace/Delete chip removal, focus restoration runs at
the controlled render checkpoint and keeps the query-relative caret offset;
it leaves focus on a different control if the user moved there in the meantime.
Suggestions use Floating UI positioning, following the same viewport-aware
popup behavior as the Web Awesome controls behind Select and PopupMenu. They
follow the field while scrolling, flip above it at the bottom edge, and shift
within narrow viewports without growing its toolbar row. One
suggestion keeps a pill outline; lists with multiple choices use the standard
rounded surface and scroll once they reach 240px. The clear button's hover and focus
highlight follows the field's pill shape or its toolbar group's rounded shape.

Managed clear captures the action before application handlers run, keeps the adopted
expanded signal open for a collapsible field, and restores the editor focus for
both collapsible and plain model fields at the actual
mutation checkpoint before the next input task. It also returns keyboard activation
from the clear button to a surviving editor immediately. No animation frame owns
clear focus, so fast typing cannot escape to page shortcuts or lose its first letter. The app still owns clearing query/tokens and emptying
DOM-owned text. This focus step respects `manageFocus: false`, disposal, removed fields,
and focus deliberately moved to another control; no app-level reopen callback is needed.

## CollapsiblePanel / sidebar

`CollapsiblePanel` is a labeled `aside` region that renders `inert` and
`aria-hidden` while collapsed, straight from the app's `collapsed` flag, so its
optional `tabIndex={0}` leaves the Tab order while closed. `tabIndex={-1}` permits
programmatic focus while open; `outlined` keeps the region's focus ring visible
only while expanded and visible. A toolbar panel's inner `Pane` can take the
same options through `pane` when that is the intended focus boundary. Its
controls leave the Tab order and the accessibility tree even while the content
is still sliding out, and focusing one can never scroll clipped content back into
view (`aria-hidden` alone left them focusable inside a hidden subtree). Its
content slides via transform (disabled under reduced motion); `inert` does not
affect rendering, so the slide still plays. A `restoreControl` renders outside
the panel and stays reachable. A collapsed `ResizableRegion` renders `inert` and
`aria-hidden` on the region itself the same way (its content wrapper is `inert`
too, and its separator is already hidden and not displayed), so no empty
labeled region landmark stays behind; its `restoreControl` stays outside the
region.
`CollapsiblePanelToggle` is a named button carrying `aria-expanded` and the
standard per-side collapse/expand glyph (`PanelLeft*` / `PanelRight*` /
`PanelBottom*`); place a collapse toggle inside the panel and an expand toggle in
an always-visible location so it is reachable while collapsed. `wireSidebar()`
moves focus into the panel when it opens and restores it to the trigger when it
closes; a trigger inside the now-inert panel hands focus to the panel's toggle
outside it instead (and focus stranded there by a wide → compact crossing is
rescued the same way), so an app may render the expand toggle only while the panel
is collapsed. When a `deviceClass()` reports `compact`, an open panel becomes an overlay
with a dismissable backdrop, Escape and backdrop-click collapse it, and Tab is
trapped within it (the ARIA dialog pattern). That modal state only ever begins
from a user action: at wire-up on a compact device and on a wide → compact
crossing, every panel starts collapsed, so no page load or resize traps focus. The application owns each `collapsed`
signal, the panels, their sizes, and content; the wire may persist the collapsed
state per panel.

## Workbench

Each `Workbench` rail and drawer is a labeled region (`aside` for a rail, `section`
for the drawer). While a panel is collapsed the region itself renders `inert` and
`aria-hidden="true"`, and so does not linger as an empty landmark, and its content
wrapper is `inert`, all rendered from the app's `collapsed` flag, so its controls
leave the Tab order and the accessibility tree even while the content is still
sliding out, and focusing one can never scroll clipped content back into view. The panel's `restoreControl` renders
outside that content and stays reachable; a resizable panel's separator also leaves
the Tab order while collapsed or not inline. `wireWorkbench`, given a panel's
`collapsed` signal, returns focus stranded in a closing panel to the control that
opened it, else the restore control, else a control whose `aria-controls` names the
panel; an open overlay panel takes focus and keeps Tab inside it (the ARIA dialog
pattern). See [`workbench.md`](workbench.md).

## Chrome material

Translucent chrome, such as a `Pane` header with
`headerPresentation="overlay"`, a `NavStack` top bar with
`chromePresentation="overlay"`, or a `NavStack` bottom toolbar with
`bottomToolbarPresentation="overlay"`, or a `TabNavigator` tab bar with
`barPresentation="overlay"`, paints `--kui-chrome-material`: the surface at
80% opacity behind a blur-and-saturate backdrop filter
(`--kui-chrome-material-filter`). Content scrolls visibly beneath it, so the
backdrop under its text is not a fixed color. The contrast rule measures the
worst case: the material composited over a solid black backdrop in the light
theme and a solid white backdrop in the dark theme. The blur only averages the
content, so it can never be darker or lighter than that.

Chrome on a raised surface, such as a `DialogSurface` title bar with
`headerPresentation="floating"`, paints `--kui-chrome-material-raised`
instead: the raised surface at the same 80%, so the bar matches the dialog
panel behind it. The same rule and fallbacks apply.

- **Normal text and icons pass AA over any content.** `--kui-color-text`
  measures about 10.5:1 (light) and 8.3:1 (dark) on that worst case, and
  about 10.5:1 (light) and 6.7:1 (dark) over the raised material. 80% is
  above the minimum opacity that keeps 4.5:1 there (about 55% light and 60%
  dark). A theme that overrides `--kui-chrome-material` or
  `--kui-chrome-material-raised` must keep its text at 4.5:1 or better
  against the same backdrops.
- **Quiet text does not, so `ToolbarText` lifts it.** `--kui-color-text-quiet`
  falls to about 3.2:1 (light) and 4.1:1 (dark) over the worst case, and the
  default-size title color to about 3.8:1 (light). Inside an overlay `Pane`
  header or overlay `NavStack` chrome or bottom toolbar, or slotted as the `label` (or into
  `header-actions`) of a `DialogSurface` floating header, an untoned
  `ToolbarText` therefore takes
  `--kui-color-text` for its title at every size, and its `description` mixes
  the quiet color halfway toward the normal one, about 5.9:1 in both themes
  (about 4.9:1 dark over the raised material). That keeps AA while the
  description still reads as secondary. Controls lift the same way in an
  overlay `Pane` header, overlay `NavStack` chrome or bottom toolbar, and a
  `DialogSurface` floating header's `header-actions`: a default-tone
  `ToolbarControlGroup`'s quiet control color over its own translucent fill
  measures about 3.0:1 (light) and 3.5:1 (dark) over the worst case, so its
  controls take `--kui-color-text` there. An overlay `TabNavigator` bar's
  unselected labels lift halfway toward `--kui-color-text`, and its selected
  label mixes 40% of it into the brand color: the plain brand color measured
  about 3.2:1 (light) over the worst case. A `DialogSurface`'s close button is an
  icon, held to the 3:1 non-text bar, and measures about 3.8:1 (light) and
  4.1:1 (dark) over the raised material. Any other quiet copy you place in
  overlay chrome yourself has no such lift; keep it in the content.
- **The material turns opaque when transparency would hurt.** Under
  `prefers-reduced-transparency: reduce` or `prefers-contrast: more`, and where
  `backdrop-filter` is unsupported, it resolves to the opaque surface. In forced
  colors, the header (or NavStack chrome) paints `Canvas` with a `CanvasText`
  bottom edge, and an overlay NavStack bottom toolbar paints `Canvas` with a
  `CanvasText` top edge, so content passing beneath it never shows through.
- **Clear chrome has no material of its own.** A `clear` Pane header,
  NavStack bar, or TabNavigator bar is transparent, so nothing guarantees its
  text over arbitrary content: keep its controls in glass control groups,
  which carry the material and AA lift with them, and give a title over
  imagery a scrim (or keep it in the content). `scrollEdge="material"` (or
  `"surface"`) fades a backing in gradually as content scrolls beneath the
  bar. Clear chrome turns
  opaque under reduced transparency or increased contrast and paints
  `Canvas` in forced colors, like the material.
- **An app can turn every effect static.** There is no reliable CSS signal
  for a low-power device, so an app that detects one sets
  `data-kui-effects="static"` on the root element
  (`document.documentElement.dataset.kuiEffects = 'static'`). The material
  then resolves to the opaque surface, and every scroll-driven animation a
  component owns stops at its resting state. A display that cannot animate
  smoothly (`@media (update: slow)`, such as e-ink) gets the same result on
  its own. Removing the attribute restores the effects.
- **A glass `ToolbarControlGroup` (`material="glass"`) carries the material
  with it.** A group floating over imagery or a clear toolbar paints
  `--kui-chrome-material` behind its own controls. The same quiet-color shortfall
  applies, so its controls always take `--kui-color-text`. A raised or outline
  selection paints an opaque surface pill, so the brand selected color keeps AA:
  over the bare 80% material it measured about 3.2:1 (light, over black). The
  group's hover mixes a text-color tint into the material, so a lone control's
  whole-group hover never drops the fill. The specular edge gives way to the
  normal group border wherever the material turns opaque, including static
  effects. A dark-toned glass group's loud fill turns opaque there too. In
  forced colors the group paints `Canvas` with a `CanvasText` border and drops
  its filter and shadow. `tests/browser/tone-contrast.spec.ts` measures rest,
  hover, and selected controls on both worst-case backdrops in all three
  engines, and checks the opaque and forced-color fallbacks in Chromium.

`tests/browser/overlay-header.spec.ts` (Pane),
`tests/browser/overlay-nav-stack.spec.ts` (NavStack top chrome),
`tests/browser/overlay-nav-stack-bottom.spec.ts` (NavStack bottom toolbar,
which also measures its description, a control, the top chrome's back
control, and increased contrast), and
`tests/browser/dialog-floating-header.spec.ts` (DialogSurface) measure the
title over the material on both worst-case backdrops in Chromium, Firefox, and
WebKit, and the Pane and DialogSurface specs also measure the description and
a header control group (DialogSurface also its close button). In
Chromium they also check the opaque fallbacks for reduced transparency and
forced colors, and the Pane and DialogSurface specs check increased contrast.

**Firefox and WebKit screenshots omit the blur.** In Playwright's Firefox and
WebKit, `page.screenshot()` (headless or headed) shows the content beneath the
material crisp, as if `backdrop-filter` did nothing. Stock Firefox's own
`--headless --screenshot` does the same. The filter is still applied: a
`recordVideo` frame of the same page in the same session, which records the
compositor's output, shows the content blurred. Firefox and WebKit draw
`backdrop-filter` only when compositing (WebRender in Firefox, Core Animation
in WebKit), and their snapshot paths repaint the page without it. Chromium's
screenshot shows the blur. Plain test pages with no kerf CSS behave the same
way, so no ancestor style in these components is blocking the filter. When
you review the blur in Firefox or WebKit, use a `recordVideo` frame, not a
screenshot. A crisp screenshot is not a defect, and contrast is unaffected
because the rule above already assumes no blur.

## Verification matrix

For each changed component, inspect default, hover, focus, disabled, selected/pressed, busy/error, long-content, wide, narrow, light, dark, increased-contrast, reduced-motion, keyboard-only, and 200%-zoom states where applicable. DOM order must match reading and focus order, with no clipping or unreachable action.

Text contrast checks must measure the painted solid-color backdrop, compositing
translucent fills from the document canvas through every ancestor and the
component itself before comparing the foreground. Raw RGB channels from an
`rgba()` value are not the rendered background. The shared browser helper in
`tests/browser/painted-contrast.ts` resolves CSS color syntax through canvas and
uses the evaluator's WCAG ratio calculation; its browser regressions cover
nested fills, transparent foregrounds, shadow-host backdrops, theme changes,
and genuinely insufficient contrast. Background images (including the catalog
checkerboard), filters, and group opacity remain separate visual-review concerns;
this helper measures only the solid CSS color layers.

Separator checks resolve the documented semantic border token in the component's
context instead of pinning an old opaque palette value, while still verifying
that the line has its intended width and a visible color.

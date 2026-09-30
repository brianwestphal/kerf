# Accessibility and keyboard contracts

These are normative contracts for package components and consuming applications.

## Shared rules

- All controls have accessible names and visible `:focus-visible` treatment.
- Decorative `LucideIcon` output is `aria-hidden`; pass `label` only when the SVG itself conveys meaning.
- `ListItem` uses native button Enter/Space behavior. `selected` maps to `aria-current="page"`; `pressed` maps to `aria-pressed`. Selected rows keep the normal foreground over their brand-tinted fill so text retains WCAG AA contrast in light and dark themes. Its leading icon visual is 18px while the row retains its 44px minimum target; multiline icons align to the first text line. Its `trailing` content is dormant and must not contain controls. Its `rootAttributes` slot accepts only application `data-*` metadata and deliberately cannot emit `role="menuitem"` in isolation—a true ARIA menu must own arrow, Home/End, Escape, and focus behavior as one widget.
- `ListHeader` owns action naming, disabled state, and disclosure `aria-expanded`. Toggle mode supplies one decorative 18px `DisclosureArrow` when `actionIcon` is omitted; it mirrors `expanded` while the native button's accessible name stays stable. The application must update that controlled state and reveal or hide real content. A valid `count` is visually rendered in an `aria-hidden` neutral pill while the required localized `countLabel` becomes part of the owning heading or disclosure button's accessible name; zero remains a real count. Its narrow `triggerAttributes` slot may describe a native popover or controlled-content relationship with `popoverTarget`, `popoverTargetAction`, `aria-controls`, and `aria-haspopup`; the application owns the target surface and its focus/dismissal behavior.
- Dispose `wireTabBars` and `wireTokenSearchFields` with their owning view. Disposal cancels queued controlled-render focus restoration, so a torn-down view cannot reclaim focus from its successor.
- `wireNavStack` moves focus into every newly active top view and remembers the last focused descendant of each mounted view for pop restoration. Mark a preferred initial heading or control with `data-nav-focus` (and `tabindex="-1"` when it is not normally tabbable); otherwise the helper uses the first enabled focusable descendant, then a programmatically focusable view-container fallback.
- In any `.kui-pane`, menu rows, `ListHeader` actions, and toolbar groups keep a minimum 44px target in both dimensions. A `ListHeader` fills the available inline width and keeps that action at the logical end, including in RTL. Its action visual defaults to 18px through `--kui-list-header-action-icon-size` inside a fitted 36px hover square; a transparent hit layer extends the pointer target to at least 44 × 44 around that square without moving layout or enlarging the painted surface. Compact headers are 36px tall like the rest of the compact List family, so their action target is 44px wide and clamped to the 36px header height instead of reaching into a neighboring row. Do not reduce the target to the visible icon, and do not force the button itself to 44px.
- `LoadingSpinner` is either labeled (`role="img"`) or hidden. Its rotation stops for reduced motion.
- An unlabeled `Skeleton` (including the value slots a component's `placeholder` prop renders) is decorative loading chrome: it is `aria-hidden`, conveys no information a user needs to act on, and is deliberately exempt from the WCAG 3:1 non-text-contrast target. Inside a solid `Badge` it stays subtle (about 2.1–4.4:1 in light, 2.4–2.8:1 in dark, depending on tone); `tests/browser/tone-contrast.spec.ts` holds those values as a regression floor rather than an accessibility threshold. Announce loading through a labeled `Skeleton`, `LoadingSpinner`, or `aria-busy` on the owning region, never through the skeleton's visibility.
- `StateBanner` defaults to polite `role="status"`; use `urgency="alert"` only for an attention-requiring failure. Its optional `badge` is persistent inline status/count content beside the title and is announced as part of the banner; keep it terse and do not rely on color alone for its meaning.
- `EmptyState` reports busy state through `aria-busy` and never relies on an illustration as its label.
- `Select` follows the Web Awesome host's standard `input`/`change` events. Application tests verify the live `value`, focus, and events—not attributes alone. Its decorative option icons and value-dependent selected content remain present after controlled rerenders, so the visible choice does not silently lose its non-text cue.
- `DisclosureArrow` is an 18px root-scaled decorative visual by default, not an interaction target. Its owning native control supplies a stable accessible name, pointer and keyboard interaction, and `aria-expanded`; multiple arrows keep independently controlled state. Consumers may resize it with the typed `size` prop without changing that ownership. Configured directions animate over the shortest path; a 180-degree closed-to-open tie uses counterclockwise rotation.
- `List` is layout-only and adds no `list` role. Children own their native or ARIA semantics. Give a scrollable List a bounded block size, avoid nested scroll owners, and keep focused children visible while scrolling.

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

Use `hint` for persistent supporting text below the control; use
`placeholderText` only for the empty value shown inside the closed control.
Kerf passes hint text through Web Awesome's form-control contract, which renders
the hint part and connects the shadow combobox to it with `aria-describedby`.
The accessible control is that shadow combobox, not the `wa-select` wrapper;
inspect or test the element returned by the `combobox` role. Both the `hint`
attribute used by Kerf and Web Awesome's explicit `hint` slot produce a computed
accessible description in Chromium, Firefox, and WebKit, so applications do not
need an `aria-description` mirror or a shadow-DOM patch.
Loading placeholders keep the same visible hint while replacing the interactive
control with inert chrome.

`tests/unit/components.test.tsx` covers name projection and visible/hidden label
variants. `tests/browser/select-accessibility.spec.ts` verifies actual accessible
names, unchanged unlabeled geometry, keyboard selection, controlled rerenders,
native hint wiring, and wide/narrow presentation in Chromium, Firefox, and WebKit.

The explicit `@kerfjs/ui/select/register` import also installs the canonical
Select lifecycle adapter. The latest open/close request owns animation completion
and deferred option focus. A stale close cannot hide a reopened popup after
resize; stale completion events are not emitted. Preventing `wa-show` or
`wa-hide` retains the accepted closed/open state, and removal prevents deferred
activation. Native option selection, keyboard behavior, dismissal listeners,
and popup anchor placement remain with Web Awesome. Raw `wa-select` elements
without the canonical `data-component="select"` marker are unchanged.
`tests/unit/select-lifecycle.test.ts` and `animate-select-popup.test.ts` cover
repeated and out-of-order completions, cancellation, instance isolation, and
removal. `tests/browser/select-lifecycle.spec.ts` repeats animation/resize/reopen
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
imports `@kerfjs/ui/help-tags/register`, which registers only the tooltip
element. Pure `SafeHtml` rendering stays zero-JS: without an installer, nothing
shows a tag.

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

`PopupMenu` renders a Web Awesome dropdown, so the menu roles, arrow-key and
typeahead navigation, Escape, and focus return to the trigger come from
`wa-dropdown`. Kerf's part is the trigger's name. A Web Awesome button takes its
name from its content and ignores an `aria-label` on the host, so an icon-only
trigger requires `label`, which renders as visually hidden text inside the
button; a trigger with visible `text` is named by that text. An icon-only
trigger also shows its `label` as an `aria-hidden` help tag on hover and
keyboard focus (see [Help tags on icon-only triggers](#help-tags-on-icon-only-triggers)). Group headings
render as the same uppercase group titles a grouped `Select` shows, and dividers
are presentational. A keyboard-focused item is the menu's current row, painted
with the Select's current-option fill rather than a second focus ring inside the
open popup. A disabled item stays in the menu but cannot be
chosen; disable the whole trigger only when every command is unavailable.

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
name. Keep supporting copy as app-owned content below the toolbar.

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
`AppTab` provides compact 32px, segmented, truncating-label, and icon-only
presentations. Icon-only tabs keep the required `name` as the tab button's
accessible name while visually hiding the duplicate label. A `pending` tab (known,
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
icon. Use tabs—not a segmented control—when choices switch page regions that
need `tab`/`tabpanel` semantics.

## TokenSearchField

`TokenSearchField` exposes the editable surface as a named `searchbox`. Each
chip is atomic (`contenteditable="false"`) and contains separately named edit
and remove buttons; the clear action is also named. Disabled fields publish
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
Applications set `expanded` while the field is focused, move focus from the
trigger into the revealed editor, and clear `expanded` only after focus leaves
the complete component. Text or tokens keep the field expanded even when that
transient state is false. Width animation is disabled under reduced motion.

When the field is composed with a caller-owned surface rendered outside it — a
suggestions listbox, date picker, or help popover — mark that surface (or wrap
it) with `data-token-search-keep-open`, or pass `collapsible.keepOpenOn(target)`,
so focus or pointer activation moving into it does not collapse an empty field.
The helper preserves the pointer target when a browser omits
`focusout.relatedTarget`, preventing the field or target from disappearing
between pointerdown and click. `wireTokenSearchFields`
can also, opt-in via `keyboard`, own atomic-chip editing keys: from a collapsed
caret with no selection, Backspace removes the token before the caret and Delete
the token after it (reported through `onRemoveToken` for the app to apply to its
controlled state), and ArrowRight moves the caret past a trailing chip so typed
text lands after it. An optional `onEdit({ id, editor, event })` — with the
originating `InputEvent` so a caller can gate on `inputType`/`data` — fires on every editor
`input`, letting a caller drop its own `input` listener; the application still
owns query parsing and result-count/loading announcements.

With a `createTokenSearchModel` passed to the field and registered in
`wireTokenSearchFields(root, { models })`, grammar parsing, chips, clear/edit/
remove actions, and suggestions are managed. Arrow Down moves from the editor
to suggestions, arrow keys move between suggestions, Enter selects one, and
Escape returns focus to the editor. The application still announces results
when needed and can supply an `evaluate` callback to compute them. Omitting the
model leaves the manual behavior above intact.

Managed clear captures the action before application handlers run, keeps the adopted
expanded signal open during editor replacement, and restores focus at the actual
mutation checkpoint before the next input task. It also returns keyboard activation
from the clear button to a surviving editor immediately. No animation frame owns
clear focus, so fast typing cannot escape to page shortcuts or lose its first letter. The app still owns clearing query/tokens and emptying
DOM-owned text. This focus step respects `manageFocus: false`, disposal, removed fields,
and focus deliberately moved to another control; no app-level reopen callback is needed.

## CollapsiblePanel / sidebar

`CollapsiblePanel` is a labeled `aside` region that renders `inert` and
`aria-hidden` while collapsed, straight from the app's `collapsed` flag, so its
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

## Verification matrix

For each changed component, inspect default, hover, focus, disabled, selected/pressed, busy/error, long-content, wide, narrow, light, dark, increased-contrast, reduced-motion, keyboard-only, and 200%-zoom states where applicable. DOM order must match reading and focus order, with no clipping or unreachable action.

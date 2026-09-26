# Accessibility and keyboard contracts

These are normative contracts for package components and consuming applications.

## Shared rules

- All controls have accessible names and visible `:focus-visible` treatment.
- Decorative `LucideIcon` output is `aria-hidden`; pass `label` only when the SVG itself conveys meaning.
- `ListItem` uses native button Enter/Space behavior. `selected` maps to `aria-current="page"`; `pressed` maps to `aria-pressed`. Selected rows keep the normal foreground over their brand-tinted fill so text retains WCAG AA contrast in light and dark themes. Its leading icon visual is 18px while the row retains its 44px minimum target; multiline icons align to the first text line. Its `trailing` content is dormant and must not contain controls. Its `rootAttributes` slot accepts only application `data-*` metadata and deliberately cannot emit `role="menuitem"` in isolation—a true ARIA menu must own arrow, Home/End, Escape, and focus behavior as one widget.
- `ListHeader` owns action naming, disabled state, and disclosure `aria-expanded`. Toggle mode supplies one decorative 18px `DisclosureArrow` when `actionIcon` is omitted; it mirrors `expanded` while the native button's accessible name stays stable. The application must update that controlled state and reveal or hide real content. A valid `count` is visually rendered in an `aria-hidden` neutral pill while the required localized `countLabel` becomes part of the owning heading or disclosure button's accessible name; zero remains a real count. Its narrow `triggerAttributes` slot may describe a native popover or controlled-content relationship with `popoverTarget`, `popoverTargetAction`, `aria-controls`, and `aria-haspopup`; the application owns the target surface and its focus/dismissal behavior.
- Dispose `wireTabBars` and `wireTokenSearchFields` with their owning view. Disposal cancels queued controlled-render focus restoration, so a torn-down view cannot reclaim focus from its successor.
- `wireNavStack` moves focus into every newly active top view and remembers the last focused descendant of each mounted view for pop restoration. Mark a preferred initial heading or control with `data-nav-focus` (and `tabindex="-1"` when it is not normally tabbable); otherwise the helper uses the first enabled focusable descendant, then a programmatically focusable view-container fallback.
- In any `.kui-pane`, menu rows, `ListHeader` actions, and toolbar groups keep a minimum 44px target in both dimensions. A `ListHeader` fills the available inline width and keeps that action at the logical end, including in RTL. Its action visual defaults to 18px through `--kui-list-header-action-icon-size`; do not reduce the target to the visible icon.
- `LoadingSpinner` is either labeled (`role="img"`) or hidden. Its rotation stops for reduced motion.
- `StateBanner` defaults to polite `role="status"`; use `urgency="alert"` only for an attention-requiring failure. Its optional `badge` is persistent inline status/count content beside the title and is announced as part of the banner; keep it terse and do not rely on color alone for its meaning.
- `EmptyState` reports busy state through `aria-busy` and never relies on an illustration as its label.
- `Select` follows the Web Awesome host's standard `input`/`change` events. Application tests verify the live `value`, focus, and events—not attributes alone. Its decorative option icons and value-dependent selected content remain present after controlled rerenders, so the visible choice does not silently lose its non-text cue.
- `DisclosureArrow` is an 18px root-scaled decorative visual by default, not an interaction target. Its owning native control supplies a stable accessible name, pointer and keyboard interaction, and `aria-expanded`; multiple arrows keep independently controlled state. Consumers may override `--kui-disclosure-arrow-size` without changing that ownership. Configured directions animate over the shortest path; a 180-degree closed-to-open tie uses counterclockwise rotation.
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

Use `presentation="toolbar-borderless"` with `size="compact"` inside a
`ToolbarControlGroup`; set `focusRingOwner="group"` when that parent paints the
composed focus ring. `selectedPresentation="icon-only"` hides only the visible
selected label—the required `label` or `ariaLabel` still names the combobox.
Inside a group, an icon-only trigger fills the group's control slot (40px in a
default group, the full 32px padding box in a compact one) and omits the
disclosure caret, so the group stays square and its focus ring stays concentric
with the visible control while focused and while its listbox is open.
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
- preview callbacks while dragging and one commit callback on release.

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
and — via `position` and `--kui-floating-toolbar-inset` — where it sits.

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
accessible name while visually hiding the duplicate label. These props own
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
stops on drop/drag end/disposal, and does not change keyboard behavior. It
returns a disposer.

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

Managed clear captures the action before application handlers run, keeps the adopted
expanded signal open during editor replacement, and restores focus at the actual
mutation checkpoint before the next input task. It also returns keyboard activation
from the clear button to a surviving editor immediately. No animation frame owns
clear focus, so fast typing cannot escape to page shortcuts or lose its first letter. The app still owns clearing query/tokens and emptying
DOM-owned text. This focus step respects `manageFocus: false`, disposal, removed fields,
and focus deliberately moved to another control; no app-level reopen callback is needed.

## CollapsiblePanel / sidebar

`CollapsiblePanel` is a labeled `aside` region that is `aria-hidden` while
collapsed; its content slides via transform (disabled under reduced motion).
`CollapsiblePanelToggle` is a named button carrying `aria-expanded` and the
standard per-side collapse/expand glyph (`PanelLeft*` / `PanelRight*` /
`PanelBottom*`); place a collapse toggle inside the panel and an expand toggle in
an always-visible location so it is reachable while collapsed. `wireSidebar()`
moves focus into the panel when it opens and restores it to the trigger when it
closes. When a `deviceClass()` reports `compact`, an open panel becomes an overlay
with a dismissable backdrop, Escape and backdrop-click collapse it, and Tab is
trapped within it (the ARIA dialog pattern). The application owns each `collapsed`
signal, the panels, their sizes, and content; the wire may persist the collapsed
state per panel.

## Verification matrix

For each changed component, inspect default, hover, focus, disabled, selected/pressed, busy/error, long-content, wide, narrow, light, dark, increased-contrast, reduced-motion, keyboard-only, and 200%-zoom states where applicable. DOM order must match reading and focus order, with no clipping or unreachable action.

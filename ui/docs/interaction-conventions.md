# Kerf UI consumer house grammar

Use these defaults when composing an application with `@kerfjs/ui`. They govern the interface a person sees and uses; [component selection](component-selection.md) and the [component catalog](../ai/components/README.md) govern the exact exports and props. A project may deviate for a compelling product reason, recorded in its own UI conventions document. A local screenshot or one screen's CSS is not a new shared rule.

## Plan the surface

Name the person's task, the primary action, the regions, and each region's state and scroll owner before writing JSX. Choose the existing Kerf component for each role and compose it through public props, variants, and theme tokens. Give application components only domain behavior or structure the package does not provide. Components own their own styling; consumer CSS does not target `.kui-*` classes, rendered parts, or private variables. When a needed variation has no public API, request the prop, token, variant, or component in Kerf and keep the gap visible.

Use the spacing scale by relationship: 8px within a group, 16px between like groups, and 24px between distinct regions. Do not pad a `Pane` and its `ContentItem` children twice. Align text with text and icons with icons. Let empty space remain empty when it clarifies hierarchy. Read [layout](layout.md), [component contract](component-contract.md), and [design philosophy](design-philosophy.md) for the ownership and rationale.

## Chrome and hierarchy

- The primary toolbar owns page identity, navigation, the view switcher, and global actions. A secondary toolbar owns a section title and its nearby actions. The pane beneath them owns content. Do not repeat a toolbar title as an in-page heading.
- Compose headings with `Toolbar` and direct `ToolbarText`; group related controls with `ToolbarControlGroup`. Keep a control near the surface it affects. A panel's collapse toggle belongs with that panel, and exactly one control owns the action.
- A toolbar or dialog header has no decorative divider by default. Use a divider only for a real boundary, such as pinned chrome over scrolling content, with the component's documented API. Do not add persistent instruction copy to explain an ordinary control.
- Keep controls mounted when a capability or state temporarily disables them, so neighboring groups do not jump. Disable with a truthful explanation. Hide a control only when the whole capability is absent or the responsive composition deliberately moves it.
- Remove, rather than disable, a recovery action whose use in the current state would be unsafe or misleading, and let the state's banner say what to do instead; disable only for temporary conditions such as busy or not yet loaded.
- Use `SegmentedControl` for a short exclusive view choice, in its own group. Put `SearchField` in the relevant toolbar and make it filter the visible collection. A search control is not a substitute for navigation.

## Actions, feedback, and dialogs

- Label a command that opens a dialog with an ellipsis: “Add Ticket…”. The dialog title names the task. For adding an object, use a “+ Thing” toolbar action and a dialog; do not leave an inline creation form in a collection view.
- Order dialog actions consistently. Cancel is the leading action, separated from the trailing primary action by a spacer. Negative actions precede positive actions. Mark a destructive action clearly and require confirmation only when undo or recovery cannot safely cover it.
- Use a toast for a transient confirmation. Use `StateBanner` in the affected region's header area for a persistent problem or status that requires attention. Show safe recovery beside the problem; remove an unsafe recovery action as described under Chrome and hierarchy. Do not use a toast as the only record of failure.
- Distinguish an empty collection, no search matches, loading, missing setup, offline state, and an error. Never show “no items” while loading. The empty state states what can happen next and offers a relevant action when one exists.
- A user action should show its safe local consequence within 100 ms, then reconcile with authoritative data without flicker. Do not block a click on unrelated data. Preserve the pending action and report a rejection where it can be corrected.

## Lists and selection

- Use ordinary row selection for browsing. Checkboxes mean multi-selection for a bulk task, not the default way to open an item. Keep selected, focused, disabled, loading, and error cues distinct and accessible without color alone.
- Put secondary row actions in a meaningful “…” menu and expose the same actions through the row's context menu. Every actionable menu entry has an icon from the application's shared icon set. Double-click opens an editable item; always offer a keyboard and visible edit route too.
- Reordering uses drag and drop when the order has meaning. Supply an accessible keyboard route and visible position feedback. Do not expose internal database or provider IDs as ordinary row copy.
- Reuse a semantic component for the same feature in different contexts, with explicit presentation or read-only variants. A list row and a board card should keep the same identity and actions. An enabled control in a demo must work in its shipped parent composition.

## Text, state, and continuity

- Persist routine edits after a short debounce, and flush on blur, page hide, or an explicit finish. Keep the user's draft visible while saving and keep a scoped recovery copy. Do not add routine Save/Cancel buttons to an editor whose action is simply to persist text. Explicit submit controls are appropriate when creating an object or completing a workflow.
- Keystrokes update the controlled draft, never a network write on each character. Treat the value at edit start as the merge base so the user's own typing does not become a conflict. Recover the draft after navigation or reload when practical.
- Unrelated renders must not close a popup, move focus, reset a draft, replace selection, or jump scroll. Application signals own durable and user-visible interaction state; a `wire…` helper owns only the mechanics its API documents. Preserve node identity when meaning has not changed.
- Scope background synchronization separately from foreground blocking work. Keep the interface usable while data refreshes, and show a clear status only where it changes a decision.

## Responsive, platform, and roles

- Declare a desktop minimum and a collapse order for each composed screen. Measure the actual content region, not only the viewport. Protect readable text, recognizable icons, and usable targets. Relocate or hide secondary labels before shrinking icons or controls below their usable size.
- Use one scroll owner per region and check narrow, intermediate, wide, zoomed, keyboard, and reduced-motion states. Avoid clipped menus and dialogs; anchored surfaces retain their trigger relationship and stay inside the viewport.
- Keep the same mental model across platforms while using native platform language and behavior. Use one icon set through a shared renderer; decorative icons are hidden from assistive technology and icon-only controls have accessible names. Do not use emoji as UI icons.
- A restricted role sees the same interface with unavailable features explained or disabled according to capability. Do not invent a separate stripped-down product that changes navigation or identity. Important state must be expressed in text or structure, not color alone.
- Do not round money or other consequential values merely for visual neatness. Label AI-generated content and uncertainty where it matters, with nearby human review, edit, undo, or reject controls.

## Review a real composition

Exercise every rendered action in the production parent composition and its catalog specimen. Inspect wide and narrow browser renderings and state transitions, including loading, empty, error, open transient surfaces, focus, draft recovery, and delayed data when relevant. Reject clipped or unreachable content, inert enabled controls, lost drafts or focus, unannounced errors, excessive chrome, and a control whose visual treatment misstates its capability. See [accessibility](accessibility.md), [catalog authoring](catalog.md), and [design philosophy](design-philosophy.md).

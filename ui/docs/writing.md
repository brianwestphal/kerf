# Writing interface copy

Kerf UI follows Apple's capitalization conventions for interface text.
Apple's _Writing_ guidance asks for one style per UI element type, applied
consistently, and its element guidance assigns those styles. This page is the
package default, so every Kerf application, demo, and recipe uses the same
rule. An application may replace it only through a written, product-wide
style. It should never vary from one screen to the next.

## Capitalization

**Names are title style. Descriptions are sentence style.** Text that names a
command, control, view, or field uses title style ("Save Draft", "Workspace
Settings", "Release Date"). Text that describes, explains, reports, or asks
uses sentence style ("Changes sync when you reconnect").

| Element                                                                                             | Style                        | Examples                                               |
| --------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------ |
| Buttons, split-button and toolbar actions, link-style commands                                      | Title                        | Save Draft, Add to Favorites, Don’t Save, Log In       |
| Menu items, menu group headings, popup-menu triggers                                                | Title                        | Copy Reference, Sort By, Recently Updated, New Folder… |
| Segmented-control segments, `Select` and pop-up choices, tabs                                       | Title                        | List View, Last 30 Days, In Review                     |
| Page, view, pane, dialog, and toolbar titles (`ToolbarText` titles), back labels                    | Title                        | Workspace Settings, Back to Inbox                      |
| Group and list headers (`ListHeader`), table column headings                                        | Title                        | Saved Projects, Needs Attention, Last Modified         |
| Catalog example and stack labels (`CatalogExample`, `CatalogExampleStack`)                          | Title                        | Heading Identity Stays Whole, Icon Trigger in a Group  |
| Content item titles: the name an item or card shows                                                 | Title                        | Build Output, Work Area, Unsaved Changes               |
| Field labels (`FieldLabel`, a field's `label`)                                                      | Title                        | Project Name, Release Date                             |
| Region and landmark names (accessible names of panes, toolbars, groups, lists, tab bars)            | Title                        | Ticket Workbench, View Actions, Open Documents         |
| Accessible names of icon-only controls                                                              | Title                        | More Actions, Clear Search                             |
| `EmptyState`, `StateBanner`, alert, and notification titles that are fragments                      | Title, no ending punctuation | No Release Tasks, Migration Needs Review               |
| The same titles written as complete sentences                                                       | Sentence, with punctuation   | Release tasks could not be refreshed.                  |
| Checkbox, switch, and radio option text                                                             | Sentence                     | Show hidden files, Notify me about replies             |
| Body copy, `description`, `detail`, hints, empty-state and banner detail, dialog and alert messages | Sentence, with punctuation   | Changes sync when you reconnect.                       |
| Tooltips and help text                                                                              | Sentence                     | Copy the link to this ticket                           |
| Placeholders                                                                                        | Sentence                     | Search tickets                                         |
| Status lines, counts, and timestamps (`ToolbarText` status, `Badge`, `CornerStatus`)                | Sentence                     | Saved just now, 3 of 12 updated                        |

A name that a component composes into a longer label is a name too, so pass
it in title style. A panel toolbar's `toggle: { action, name }` labels the
toggle group with `name` and completes "Show …" / "Hide …" with it:
`name: "Navigator"` gives "Show Navigator". Kerf UI never recapitalizes it.

Data is never recapitalized. Names that a person or a system supplies keep
their own spelling: file names, ticket titles, user names, and tags. So do
code identifiers shown as text, such as a prop value a specimen is labeled
with (`danger`, `transparent`). A content
item that shows such data (a ticket subject, a message) keeps it as written;
only a title the interface itself names is title style. `ContentItem`'s own
`title` prop is a native tooltip, so it is sentence style. Keep a content
item's `ariaLabel` equal to its visible title.

### Title-style rules

From the [Apple Style Guide](https://support.apple.com/guide/applestyleguide/c-apsgb744e4a3/web)
(_capitalization_):

- **Capitalize** the first and last word, whatever their part of speech.
- **Capitalize** nouns, pronouns, verbs, adjectives, and adverbs, however
  short: It, This, Your, Is, Are, Be.
- **Capitalize** subordinating conjunctions such as If, and prepositions of
  five letters or more: About, Between, Through.
- **Capitalize** a preposition of any length that belongs to a phrasal verb
  or acts as another part of speech: Start Up the Computer, Turn On, Log In to
  the Server.
- **Capitalize** the second word of a hyphenated compound: High-Level Events,
  Pop-Up Menu. Built-in and Plug-in are the exceptions.
- **Keep lowercase**:
  - articles (a, an, the), unless one is the first word or follows a colon;
  - coordinating conjunctions (and, but, or, nor, for, yet, so);
  - _to_ in an infinitive (How to Start Your Computer);
  - _as_ (Export a Document as a PDF);
  - prepositions of four letters or fewer (at, by, for, from, in, into, of,
    off, on, onto, out, over, to, up, with).
- **Keep the brand's own spelling** for words that always start lowercase,
  such as iPad, iOS, and macOS.

### Sentence-style rules

Capitalize the first word and proper nouns or adjectives only. End a complete
sentence with punctuation. Leave a fragment without ending punctuation.
Tooltips may omit the final period.

### Related conventions

- An ellipsis (…) ends a command or menu item that needs more input before it
  acts: New Ticket…, Save As…. The dialog it opens repeats the command as its
  title, without the ellipsis.
- Label an action with its result. Prefer a verb: Publish Update, not OK.
- Keep a control's accessible name equal to its visible label, or starting
  with it.

## Diagnostics

`kerf-ui-doctor` reports `KUI-D040` (warning) when a string literal passed to a
known title-style prop leaves a word lowercase that title style capitalizes.
The covered props are:

- `ToolbarText` `text` when the text is a title: it has `headingLevel`, a
  large size, or sits in a toolbar or panel `title`, `header`, or (unless small) `leading` slot;
- `ListHeader`, `ListActionRow`, `SplitButton`, and `Combobox` `label`;
- `CatalogExample` and `CatalogExampleStack` `label`;
- `EmptyState` and `StateBanner` `title`;
- `PopupMenu` `text` and item and heading labels, including submenus;
- `SegmentedControl`, `Select`, and `TabNavigator` choice and tab labels;
- `NavStack` view titles and `backText`, and `SplitView` `backLabel`;
- `FieldLabel` text and the text of a `button` or `wa-button`;
- the `name` of a panel toolbar's `toggle: { action, name }`;
- region and landmark names: the `label` of `Pane`, `Workbench`, `Toolbar`,
  `ToolbarControlGroup`, `TabBar`, `NavStack`, `CollapsiblePanel`,
  `FloatingToolbar`, and `ResizableRegion`, the `ariaLabel` of `SunkenPanel`
  and `List`, a `Pane`'s `contentLabel`, the panel, toolbar, and pane labels
  inside `Workbench`, `CollapsiblePanel`, and `NavStack` configuration, and
  the `aria-label` of a landmark element (`section`, `nav`, `aside`, `main`,
  `header`, `footer`, `form`, `search`) or landmark role;
- the `label` of a raw `wa-input`, `wa-select`, `wa-textarea`, or
  `wa-radio-group`;
- the accessible names of icon-only controls: `IconButton` and
  `IconToggleButton` `label`, `PopupMenu` `label`, `SplitButton`
  `optionsLabel`, `TokenSearchField` `clearLabel`, and the `aria-label` of a
  `button` or `wa-button` whose only content is an icon.

The check never judges sentence-style surfaces (including `wa-checkbox`,
`wa-switch`, and `wa-radio` option text and the `LoadingSpinner` and
`Skeleton` status labels), dynamic values, or text ending with `.`, `!`, or
`?`. It skips tokens containing digits, code, or paths, and
lowercase-led brands such as iOS. It does not report capitalized short words,
because Apple capitalizes a phrasal verb's particle. Suppress `KUI-D040` for a
lowercase brand or product name. See [the doctor](./ui-doctor.md).

## Sources

- Apple Human Interface Guidelines,
  [Writing](https://developer.apple.com/design/human-interface-guidelines/writing):
  choose a capitalization style for each element type and use it consistently.
- [Menus](https://developer.apple.com/design/human-interface-guidelines/menus)
  and [The menu bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar):
  menu items and multi-word menu titles use title-style capitalization.
- [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
  and [Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications):
  a fragment title uses title style. A complete-sentence title and the
  message use sentence style with punctuation.
- [Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help):
  tooltips use sentence case.
- The archived OS X Human Interface Guidelines, _Use the Right Capitalization
  Style in Labels and Text_. Title style covers menu titles and items, push
  buttons, toolbar item labels, and labels that are not sentences, such as
  group box and list headings. Sentence style covers checkbox and radio option
  text and dialog messages.
- [Apple Style Guide](https://support.apple.com/guide/applestyleguide/c-apsgb744e4a3/web),
  _capitalization_: the title-style word rules above.

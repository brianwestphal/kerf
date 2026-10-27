# Native Sketch coverage

Generated from `scripts/build-design-templates.mjs` by
`scripts/sketch/catalog/coverage.mjs`. Run with `--write` after changing
the template manifest or a family assignment. The offline
`check:design-templates` gate compares this file with the current tree.

The source inventory has **33 components**, **110 variants**,
and **220 light/dark SVG captures**. Supported means that an editable
native Symbol batch passed its own browser, override, resize, imported consumer,
and save/reopen checks. Pending means the SVG exists but its reusable Sketch
component boundary and semantic layout have not passed those checks. A source
variant may be a multi-control showcase; a family ticket must export its actual
individual component states and retain the sheet only as a catalog page.

The Button pilot covers seven source showcase variants with 40 editable
appearance Symbols in [Kerf-Button.sketch](button/README.md). The Form controls
batch covers 20 showcase variants with 66 individual light/dark Symbols in
[Kerf-Forms.sketch](forms/README.md). The Advanced inputs batch covers 17
variants with 34 light/dark Symbols in [Kerf-Advanced.sketch](advanced/README.md).
The Lists and data batch covers 21 variants with 42 light/dark Symbols in
[Kerf-Lists.sketch](lists/README.md). The Toolbars and navigation batch covers
25 variants with 70 light/dark Symbols for 35 individual controls in
[Kerf-Toolbar.sketch](toolbar/README.md). The Content and feedback batch covers
20 variants with 56 light/dark Symbols for 28 reusable roots in
[Kerf-Content.sketch](content/README.md). Every source variant now has a
supported native batch; a new template variant must join a family here. The catalog's [install and update guide](README.md) identifies
the current libraries and supported Sketch version.

## Family batches

| Family                  | Components | Source variants | Status    | Ticket    |
| ----------------------- | ---------: | --------------: | --------- | --------- |
| Button pilot            |          1 |               7 | supported | KF-MKW7QZ |
| Form controls           |          6 |              20 | supported | KF-8VXPDP |
| Advanced inputs         |          7 |              17 | supported | KF-6CC071 |
| Toolbars and navigation |          7 |              25 | supported | KF-6Q8S95 |
| Lists and data          |          5 |              21 | supported | KF-83M2MW |
| Content and feedback    |          7 |              20 | supported | KF-P0X4R9 |

## Variant inventory

| Component             | Source variant       | Presentation                                | Native status | Ticket    |
| --------------------- | -------------------- | ------------------------------------------- | ------------- | --------- |
| button                | tones                | Primary Tones                               | supported     | KF-MKW7QZ |
| button                | emphasis             | Secondary and Plain Emphasis                | supported     | KF-MKW7QZ |
| button                | icons                | With an Icon, and Icon Only                 | supported     | KF-MKW7QZ |
| button                | states               | Compact and Disabled                        | supported     | KF-MKW7QZ |
| button                | toggles              | Toggle, Resting and Pressed                 | supported     | KF-MKW7QZ |
| button                | pill                 | Pill Shape                                  | supported     | KF-MKW7QZ |
| button                | full-width           | Full-Width Primary Action                   | supported     | KF-MKW7QZ |
| split-button          | tones                | Rounded Tones                               | supported     | KF-8VXPDP |
| split-button          | pill                 | Pill Shape                                  | supported     | KF-8VXPDP |
| split-button          | states               | Busy and Disabled                           | supported     | KF-8VXPDP |
| split-button          | full-width           | Full-Width Primary Action                   | supported     | KF-8VXPDP |
| text-field            | labeled              | Label, Value, and Hint                      | supported     | KF-8VXPDP |
| text-field            | search               | Search with an Icon                         | supported     | KF-8VXPDP |
| text-field            | error                | Required with an Error                      | supported     | KF-8VXPDP |
| text-field            | multiline            | Growing Multi-Line with a Count             | supported     | KF-8VXPDP |
| text-field            | compact              | Compact                                     | supported     | KF-8VXPDP |
| text-field            | number               | Bounded Decimal                             | supported     | KF-8VXPDP |
| checkbox              | states               | Checked, Unchecked, and Disabled            | supported     | KF-8VXPDP |
| checkbox              | mixed                | Mixed Parent                                | supported     | KF-8VXPDP |
| checkbox              | error                | Required with an Error                      | supported     | KF-8VXPDP |
| checkbox              | compact              | Compact                                     | supported     | KF-8VXPDP |
| checkbox-group        | vertical             | Stacked Choices with Hints                  | supported     | KF-8VXPDP |
| checkbox-group        | horizontal           | Horizontal, Compact, with an Error          | supported     | KF-8VXPDP |
| radio-group           | vertical             | Stacked Choices with Hints                  | supported     | KF-8VXPDP |
| radio-group           | horizontal           | Horizontal, Compact, with an Error          | supported     | KF-8VXPDP |
| switch                | states               | On, Off, and Disabled                       | supported     | KF-8VXPDP |
| switch                | compact              | Compact                                     | supported     | KF-8VXPDP |
| select                | form                 | Labeled Form Field                          | supported     | KF-6CC071 |
| select                | icons                | Choices with Icons                          | supported     | KF-6CC071 |
| select                | compact              | Compact, Disabled                           | supported     | KF-6CC071 |
| search-field          | tokens               | Text with Atomic Tokens                     | supported     | KF-6CC071 |
| search-field          | empty                | Empty, Expanded                             | supported     | KF-6CC071 |
| tag-field             | tags                 | Label, Tags, and Hint                       | supported     | KF-6CC071 |
| tag-field             | error                | Error                                       | supported     | KF-6CC071 |
| slider                | readout              | Label, Readout, and Hint                    | supported     | KF-6CC071 |
| slider                | ticks                | Stepped with Ticks                          | supported     | KF-6CC071 |
| slider                | compact              | Compact                                     | supported     | KF-6CC071 |
| color-field           | hint                 | Label, Color, and Hint                      | supported     | KF-6CC071 |
| color-field           | compact              | Compact with Opacity                        | supported     | KF-6CC071 |
| color-field           | error                | Disabled with an Error                      | supported     | KF-6CC071 |
| color-picker          | rgb                  | RGB with Presets                            | supported     | KF-6CC071 |
| color-picker          | hsb                  | HSB with Opacity                            | supported     | KF-6CC071 |
| color-picker          | gray                 | Opaque Grayscale                            | supported     | KF-6CC071 |
| color-swatches        | palette              | Palette with a Choice                       | supported     | KF-6CC071 |
| toolbar-control-group | icon-tile-neutral    | Neutral Quiet Icon Tile                     | supported     | KF-6Q8S95 |
| toolbar-control-group | icon-tile-brand      | Brand Quiet Icon Tile                       | supported     | KF-6Q8S95 |
| toolbar-control-group | icon-tile-success    | Success Quiet Icon Tile                     | supported     | KF-6Q8S95 |
| toolbar-control-group | icon-tile-warning    | Warning Quiet Icon Tile                     | supported     | KF-6Q8S95 |
| toolbar-control-group | icon-tile-danger     | Danger Quiet Icon Tile                      | supported     | KF-6Q8S95 |
| toolbar-control-group | icon-buttons         | Bordered Group of Icon Buttons              | supported     | KF-6Q8S95 |
| toolbar-control-group | borderless-single    | Borderless Single Control                   | supported     | KF-6Q8S95 |
| toolbar-control-group | with-text            | Label Text Beside a Control                 | supported     | KF-6Q8S95 |
| toolbar-control-group | glass                | Glass Material Over Artwork                 | supported     | KF-6Q8S95 |
| toolbar-control-group | push-buttons         | Push-Appearance Buttons                     | supported     | KF-6Q8S95 |
| toolbar               | title-and-actions    | Title with a Trailing Group                 | supported     | KF-6Q8S95 |
| toolbar               | width-visibility-600 | Width Visibility (600px)                    | supported     | KF-6Q8S95 |
| toolbar               | width-visibility-320 | Width Visibility (320px)                    | supported     | KF-6Q8S95 |
| toolbar-text          | dark-tone            | Dark Toolbar Tone                           | supported     | KF-6Q8S95 |
| toolbar-text          | large                | Large (Title)                               | supported     | KF-6Q8S95 |
| toolbar-text          | default              | Default                                     | supported     | KF-6Q8S95 |
| toolbar-text          | small                | Small (Label)                               | supported     | KF-6Q8S95 |
| tab-bar               | workspace-tabs       | Selected Tab Among Peers                    | supported     | KF-6Q8S95 |
| segmented-control     | equal                | Equal-Width Rounded                         | supported     | KF-6Q8S95 |
| segmented-control     | pill-small           | Pill, Small                                 | supported     | KF-6Q8S95 |
| choice-chips          | color-palette        | Wrapping Color Palette                      | supported     | KF-6Q8S95 |
| choice-chips          | compact-icons        | Compact with Icons                          | supported     | KF-6Q8S95 |
| choice-chips          | multiple             | Multiple Selection                          | supported     | KF-6Q8S95 |
| chip                  | tags                 | Removable, Link, and Plain Tags             | supported     | KF-6Q8S95 |
| chip                  | action-filters       | Action Chips in a Compact Value Table       | supported     | KF-6Q8S95 |
| list                  | stack                | Standard Gap and Four Dividers              | supported     | KF-83M2MW |
| list                  | compact              | Compact, No Gap                             | supported     | KF-83M2MW |
| list-item             | default              | Icon and Label                              | supported     | KF-83M2MW |
| list-item             | selected             | Selected (aria-current)                     | supported     | KF-83M2MW |
| list-item             | trailing             | Trailing Metadata                           | supported     | KF-83M2MW |
| list-item             | multiline            | Multiline Label (Icon Aligns to First Line) | supported     | KF-83M2MW |
| list-item             | icon-tile            | Tone Icon Tile                              | supported     | KF-83M2MW |
| list-header           | action               | Label with an Action                        | supported     | KF-83M2MW |
| list-header           | count                | Label with a Count Pill                     | supported     | KF-83M2MW |
| list-header           | size-xs              | Label Size XS                               | supported     | KF-83M2MW |
| list-header           | size-m               | Label Size M                                | supported     | KF-83M2MW |
| list-header           | size-l               | Label Size L                                | supported     | KF-83M2MW |
| list-header           | size-xl              | Label Size XL                               | supported     | KF-83M2MW |
| list-header           | inline-action        | Inline Label with an Action                 | supported     | KF-83M2MW |
| list-header           | toggle-collapsed     | Disclosure Toggle, Collapsed                | supported     | KF-83M2MW |
| list-header           | toggle-expanded      | Disclosure Toggle, Expanded                 | supported     | KF-83M2MW |
| list-action-row       | default              | Primary with a Trailing Action              | supported     | KF-83M2MW |
| list-action-row       | selected             | Selected Primary                            | supported     | KF-83M2MW |
| list-action-row       | trailing-menu        | Trailing Overflow Menu                      | supported     | KF-83M2MW |
| list-action-row       | icon-tile            | Colored Icon Tile                           | supported     | KF-83M2MW |
| value-table           | details              | Key/Value Detail Rows                       | supported     | KF-83M2MW |
| disclosure            | plain                | Closed and Open                             | supported     | KF-P0X4R9 |
| disclosure            | framed-sunken        | Framed and Sunken                           | supported     | KF-P0X4R9 |
| disclosure            | embedded             | Embedded in a Content Item                  | supported     | KF-P0X4R9 |
| message-composer      | chat                 | Chat MessageComposer with Hint              | supported     | KF-P0X4R9 |
| message-composer      | prompt               | Prompt with Taller Bounds                   | supported     | KF-P0X4R9 |
| progress-bar          | determinate          | Labeled with a Readout                      | supported     | KF-P0X4R9 |
| progress-bar          | tones                | Tones and Compact                           | supported     | KF-P0X4R9 |
| progress-ring         | sizes                | Small, Medium, and Large                    | supported     | KF-P0X4R9 |
| progress-ring         | tones                | Tones                                       | supported     | KF-P0X4R9 |
| state-banner          | info                 | Info                                        | supported     | KF-P0X4R9 |
| state-banner          | info-badge           | Info with Badge                             | supported     | KF-P0X4R9 |
| state-banner          | success              | Success                                     | supported     | KF-P0X4R9 |
| state-banner          | warning              | Warning                                     | supported     | KF-P0X4R9 |
| state-banner          | danger               | Danger (Alert)                              | supported     | KF-P0X4R9 |
| state-banner          | strip                | Strip (Full-Width Band)                     | supported     | KF-P0X4R9 |
| empty-state           | with-action          | Icon, Title, Detail, and Action             | supported     | KF-P0X4R9 |
| empty-state           | filtered             | No Results for a Filter                     | supported     | KF-P0X4R9 |
| skeleton              | block                | Single Block                                | supported     | KF-P0X4R9 |
| skeleton              | lines                | Paragraph Lines                             | supported     | KF-P0X4R9 |
| skeleton              | avatar               | Circular (Avatar)                           | supported     | KF-P0X4R9 |

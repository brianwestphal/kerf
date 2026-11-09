# Worked example: Hot Sheet group concepts

In `HS2-3XNTSD`, the designer explored ticket groups inside Hot Sheet's real list and column screens. The baseline was the existing app shell; concept captures used production Kerf UI components and synthetic tickets. The first batch included list and column views, a context menu, a dialog, search, a 390px layout, and dark mode.

Gallery feedback identified a white backing that made a collapsed group's corners look wrong and a group title that sat too far right of the ticket icons. The second batch kept the original files and added `-v2` revisions. It placed group panels directly on the workspace with separate list cards and aligned titles with the icon edge. The decision record named the feedback, the resulting layout change, and remaining choices. Only after the maintainer approved the revised design were implementation tickets split by data model, rendering, search, menus, and drag behavior.

`HS2-CT5EWR` used the same pattern for standby and statistics surfaces: captures of existing real screens, several proposed revisions in the app shell, light/dark review, and explicit caveats about synthetic data and unimplemented data sources. These examples illustrate design review, not proof that the eventual features shipped.

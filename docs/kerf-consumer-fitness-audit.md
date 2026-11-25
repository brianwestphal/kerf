# Kerf consumer fitness audit

Audited 25 November 2026 against Kerf `c7a1a4768`, Glassbox 2
`b0a1e18a2`, and Hot Sheet 2 `63b75e7b2`. This report compares the public
Kerf and Kerf UI contracts with the two consumers' source and their existing
backlogs. It separates a missing Kerf contract from a consumer choosing not to
use one. A ticket link identifies the project that owns each next action.

Glassbox 2 currently pins `kerfjs`, `@kerfjs/ui`, and the ESLint plugin to
`5.0.0-beta.134`. Hot Sheet 2 pins those three and
`create-kerf-component` to `5.0.0-beta.135`. These are the versions in the
current package manifests, not the older versions recorded in some tickets.

## Kerf gaps found from consumer use

| Finding                                                                                   | Evidence and disposition                                                                                                                                                                                                                    | Ticket    |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Workbench exposes a Pane, but the app had no public way to identify its content scroller. | Glassbox `clients/web/src/components/review/review-history.ts` queries `.kui-pane__content` under Comparison. Kerf now forwards `PaneConfig.contentClassName` so the app can name its scroll region without a private selector.             | KF-9EE8VN |
| PopupMenu lacked a public root lifecycle query.                                           | Hot Sheet `clients/web/src/popup-menu-state.ts` inspects private trigger, context-anchor, and menu classes. Kerf now exports `isPopupMenuOpen(root)` and `closedPopupMenuRoot(event)`. The consumer still owns its focus and intent policy. | KF-4NH48X |
| A catalog could show an increased-contrast control but had no shared preview scope.       | Glassbox `clients/web/src/ux-demo/style.css` supplied only a few local token overrides. Kerf now supports `data-kui-contrast="more"` on the document root, including component contrast rules; OS `prefers-contrast` remains independent.   | KF-DXX2WS |

## Glassbox 2 adoption

| Finding                                                           | Evidence and next action                                                                                                                                                                                                                        | Ticket     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Review history uses the private Workbench Pane scroller selector. | `clients/web/src/components/review/review-history.ts` defines `mainSelector` with `.kui-pane__content`. Adopt `contentClassName`, keeping the nested text diff scroller preference and testing history restoration and definition reveal.       | HS2-533A50 |
| The catalog's contrast mode is locally styled.                    | `clients/web/src/ux-demo/main.tsx` toggles `catalog-contrast`; `style.css` overrides only neutral border and focus tokens. Adopt Kerf's root attribute and remove those overrides; retain independent reduced-motion behavior.                  | HS2-T9J9BE |
| Discussion edit persistence owns a trailing timer.                | `clients/web/src/components/discussion/discussion-state.ts` uses `setTimeout(..., 350)` and explicit cancellation. Adopt `kerfjs/timing` debounce while retaining awaitable explicit save, reset, and error behavior.                           | HS2-9RWAAQ |
| The upstream catalog projection stops at direct dependencies.     | `clients/web/src/ux-demo/catalog.ts` and `clients/web/docs/ui-conventions.md` describe the collapsed direct Kerf section. Extend it to transitive library catalogs after confirming the installed release includes the completed KF-9518M8 API. | HS2-S9EG8B |

## Hot Sheet 2 adoption

| Finding                                                                                          | Evidence and next action                                                                                                                                                                                                                                                                                    | Ticket                 |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Consumer packages need one release target.                                                       | `clients/web/package.json` now pins four direct Kerf packages to beta.135, ahead of the older beta.130 described by the ticket. Review release deltas and move all four to the shared version designated by KF-1WSDWC; keep the nested `domotion-svg` pin under transitive policy.                          | HS2-0NF4BD             |
| Popup menu state depends on private classes.                                                     | `clients/web/src/popup-menu-state.ts` defines `OPENER` and `POPUP_MENU_PANEL` from `.kui-popup-menu__*`. Adopt Kerf's root lifecycle helpers after its release and preserve Escape, context menu, submenu, and rapid reopen behavior.                                                                       | HS2-XD2C6C             |
| Repeating the selected workspace sort relies on a private Select option click.                   | `clients/web/src/components/workspace-header-interactions.ts` delegates to `.kui-select__option`; Select's public change event does not cover reselecting the same value to reverse direction. Use public PopupMenu actions or a separate reverse action, with keyboard and narrow-layout coverage.         | HS2-BV9PCH             |
| The orchestration board owns ColumnTrack scroll placement.                                       | `clients/web/src/features/orchestration-view.ts` writes `track.scrollLeft` with retry and resize handling. Adopt public ColumnTrack start and `wireColumnTracks` while preserving the app's desktop and phone starting positions.                                                                           | HS2-B15QQP             |
| Minimized ticket labels combine slug and title in one line.                                      | `clients/web/src/components/minimized-tickets-control.tsx` sets each PopupMenu item's `label` to `ticket.label` and does not use the public secondary description available since KF-HZTE26. Keep the draft badge and restore naming when adopting it.                                                      | HS2-E7AR4S             |
| Quick ticket composition still uses a raw Web Awesome dialog and part overrides.                 | `clients/web/src/components/quick-ticket-composer.tsx` renders `wa-dialog`; the app CSS styles its parts. Evaluate Kerf `DialogSurface` against focus return, drop targets, mobile fit, and drafts before replacing it, and file a precise Kerf gap if the public contract cannot preserve those behaviors. | HS2-CR912H             |
| Theme choice previously drew app-owned preview tiles.                                            | The current `clients/web/src/components/theme-picker.tsx` uses public `RadioGroup presentation="tiles"` with `themeTileArt` previews; the old `theme-picker.css` is gone. This adoption is complete and its existing ticket is archived.                                                                    | HS2-VW7JVV             |
| Phone terminal search still has a long-query rail problem and a newer approved full-screen flow. | The existing long-query ticket records the narrow rail overflow; Kerf TabBar fix KF-X9A8X9 is complete. The approved full-screen search ticket is in final testing. Keep both tickets linked to this finding; validate the final behavior in the consumer rather than duplicating a Kerf workaround.        | HS2-AZD07A, HS2-7HPXCY |

## Follow-through

The three Kerf gaps are implemented on main; consumer migrations remain in their
owning backlogs. KF-1WSDWC tracks their shared release
version. Ticket status may change after this snapshot; the source paths and
package manifests above are the evidence for this audit, not a claim that each
consumer ticket remains open indefinitely.

# ContentItem media scroll performance investigation

`ContentItem.media` composes `BackdropImage` for image-led cards. A recorded Newsmonger feed with 200 image-backed cards exposed a Chromium scroll regression under fourfold CPU throttling (KF-NMB087, 200-card media performance investigation). The comparison used the former feed image nodes as its baseline and the public beta.111 media composition as its effect. Both loaded the same server data and 200 unique image URLs; all images decoded before scrolling, and neither run reported page errors. The baseline bundle override was checked for raw story images and zero `BackdropImage` nodes, and the effect for the inverse.

| 200 cards, 240 forward/reverse frames | Former feed p95 | Media effect p95 | Frames over 50 ms, former → effect |
| ------------------------------------- | --------------: | ---------------: | ---------------------------------: |
| 1440px, 2400px local crossing         |         19.0 ms |          50.9 ms |                             0 → 13 |
| 390px, 2400px local crossing          |         19.0 ms |          26.7 ms |                              0 → 0 |
| 1440px, rapid full-feed sweep         |         23.6 ms |          73.0 ms |                            0 → 123 |
| 390px, rapid full-feed sweep          |         18.8 ms |          42.4 ms |                              0 → 1 |

The rapid desktop trace increased Layerize from 389 to 3621 ms, PrePaint from 55 to 629 ms, Paint from 2704 to 3346 ms, raster from 1065 to 1870 ms, and peak observed layers from 9 to 141. These event durations overlap and cannot be summed as CPU time. The trace recorded no geometric Layout events, and app JavaScript was comparatively small. Layer construction, prepaint, and raster are leading suspects; the trace does not isolate parallax, blur, fade, mask, tint, or image memory. The 432 MB unique-source RGBA figure is an estimate from natural image sizes, not measured GPU allocation.

A browser-side CSS ablation toggled the moving, blurred, filtered, and masked layers without changing component source. It did not establish a causal ranking: in a single page of 200 cards (396 image elements, because two media blocks were absent), the unchanged desktop effect measured 43.1 ms p95 on its first pass and 22.6 ms when repeated after the variants. That run requested decode for every present image but did not separately record the decoded count. The two completed fresh-context variants were not counterbalanced. Each toggle's computed animation, filter, and mask state was checked, and no page errors occurred. The narrow, warmed passes clustered near 19 ms p95. One-pass toggles therefore cannot justify a component change or an application CSS workaround.

KF-J5SAFS followed up with counterbalanced measurements and an opt-in shared-component change below. The original raw traces and harnesses are attached to KF-NMB087.

## Follow-up measurement and shipped option

KF-J5SAFS repeated fresh-context CSS ablations against the same seeded real feed under Chromium fourfold CPU throttling. In two counterbalanced 200-card desktop blocks, the unchanged effect measured 44–46 ms first-pass p95. Removing the parallax layer lowered it to 33–34 ms; removing filters alone did not improve it. Deferring the whole card's offscreen rendering lowered it to 19–21 ms, but initially shortened the feed's scroll height by 473–507px. That violates scroll restoration and can cause a jump as cards become visible.

Applying `content-visibility: auto` only to the `BackdropImage` hero preserved the measured scroll height exactly while lowering first-pass p95 from 44.7 to 33.3 ms at 1440px and 31.0 to 25.1 ms at 390px. Peak observed layers fell from 97 to 33 and from 44 to 16, respectively. This is an opt-in `BackdropImage.deferOffscreen` / `ContentItem.media.deferOffscreen` setting for dense feeds. It leaves the card body, actions, aspect-ratio reservation, and shared Pane scrollport in layout; browsers without `content-visibility` simply paint the hero normally. The existing scroll timeline and static accessibility fallbacks remain unchanged.

An exact 50-card counterbalanced follow-up found first-pass p95 of 18.7 ms unchanged versus 18.6 ms with hero deferral at 1440px, and 18.2 versus 18.6 ms at 390px. All four runs preserved feed scroll height; peak layers were 97 versus 33 on desktop and 44 versus 16 on narrow. The 50-card feed is near the display cadence floor, so deferral provides no measurable frame-time gain at that size. The earlier mismatched 50/52-card block is excluded from this conclusion.

The 200-card hero ablation decoded 324/396 images before traversal on desktop and 352/396 on narrow, versus all images in the unchanged effect. Browser checks therefore verify that visible images are ready after scrolling to them and that feed geometry remains stable. These numbers measure a specific seeded local feed and CPU setting, not a general frame-time guarantee.

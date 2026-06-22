# 10. Migrating to Kerf — the comparison hub

A pillar page set on the docs site that translates the same reference app from each popular competing framework (React, Vue, Svelte, Solid, Preact, Alpine, Lit, vanjs, htmx, Angular, jQuery, Redux, Astro) into kerf, side by side. Lives at `/kerf/migrating/` with one page per source framework underneath.

This doc covers **why** the comparison hub exists, **what** each page surfaces, and the constraints that shape the content.

## 10.1 Why it exists

Per KF-124: people convert when they see *their current code* rewritten, not a generic counter. The homepage cards and the API reference answer "what is kerf"; they don't answer "what does my current app look like *in* kerf." The migrating hub is the answer.

The audience is a developer who has *already* decided to look at alternatives — they typed "react alternatives small bundle" or "alpinejs vs ..." into a search engine. The job of these pages is to put kerf in the lineup with concrete, code-level comparisons rather than abstract claims.

## 10.2 Page set

Pages under `/kerf/migrating/`:

- `/kerf/migrating/` — index. Comparison matrix + cards linking to each per-framework page.
- `/kerf/migrating/react/` — coming from React 19.
- `/kerf/migrating/incremental/` — framework-agnostic incremental-adoption guide. Does NOT follow the five-section per-framework shape; covers coexistence (a kerf island inside React via an empty host, and a foreign island inside kerf via `data-morph-skip`), the per-file `jsxImportSource` pragma, `mount()` teardown on unmount, and signal/store state bridging. Linked from the index callout and the per-framework pages.
- `/kerf/migrating/vue/` — coming from Vue 3 Composition API.
- `/kerf/migrating/svelte/` — coming from Svelte 5 (runes).
- `/kerf/migrating/solid/` — coming from Solid 1.9. Honest about when Solid stays the better answer (KF-211: kerf does not target Solid's compiler-driven update-path perf).
- `/kerf/migrating/preact/` — coming from Preact (signals or hooks).
- `/kerf/migrating/alpine/` — coming from Alpine 3.
- `/kerf/migrating/lit/` — coming from Lit 3.
- `/kerf/migrating/vanjs/` — coming from vanjs 1.5.
- `/kerf/migrating/htmx/` — coming from htmx. Not interchangeable on the same problem; the page explains when each tool wins and how they compose.
- `/kerf/migrating/angular/` — coming from Angular. Direct about the mismatch (Angular is batteries-included; kerf is a runtime).
- `/kerf/migrating/jquery/` — coming from jQuery. The closest philosophical analog — delegation, direct DOM ops — plus a reactive state model.
- `/kerf/migrating/redux/` — coming from Redux. Redux is a state-management library, not a framework; maps reducers/actions/selectors onto `signal` / `defineStore` / `computed`.
- `/kerf/migrating/astro/` — using kerf with Astro. Astro is the meta-framework; kerf is the island runtime.

Separate pages (not one long page, not tabs) so each "coming from X" headline matches the actual search query and gets its own indexable URL.

## 10.3 The reference app

**Classic todo list.** Add, toggle, delete, filter, persist. Roughly 150 lines in every framework. The kerf version is the existing `site/src/examples/complete/todomvc/` app — translations should keep parity with it so anyone clicking through to **Run live →** sees the thing the migration page promised.

The todo list was chosen over the alternatives (krausest-style keyed list, markdown editor, multi-signal dashboard) because:

- It is the canonical "how every framework feels" demo, so cross-framework comparison is fair.
- Every framework's idiomatic todo list already exists online, so the source-side code is non-controversial.
- It exercises the four things kerf cares about: signals/store, keyed list, delegated events, persistence.

## 10.4 Per-page structure

Each `/kerf/migrating/<framework>/` page follows the same five-section shape:

1. **Bundle delta** — min+gz runtime sizes for the source framework and kerf, with a one-line read on what the trade buys.
2. **Mental-model translations** — a primitives table. `useState` → `signal`. `useEffect` → `effect`. `x-data` → `defineStore`. `repeat()` → `each()`. The table is the page's most-skimmed asset.
3. **Side-by-side code** — the same todo list, source on the left, kerf on the right, broken into sections (state, render, list, events, persistence). Each block links to **Run live →** for the kerf version.
4. **Gotchas** — what trips developers coming from this specific framework. React devs expect `<Component />` semantics. Alpine devs expect DOM-attribute reactivity. Lit devs expect Shadow DOM. vanjs devs expect render functions to return DOM nodes.
5. **Perf numbers** — krausest deltas pulled from [`bench/results.md`](../bench/results.md) for the operations that change most. Alpine is excluded from the cross-framework perf table because it isn't in krausest.

## 10.5 Homepage integration

Two entry points to the hub:

- **Sidebar nav** — a `Migrating` section in `site/astro.config.mjs` with five entries (index + four framework pages). Always-visible, lets readers who are already on the docs site find it without going through the homepage.
- **Hero CTA** — a `Coming from React?` button next to **Get started** / **View examples** on the homepage hero. The CTA links to the `/migrating/` index, not directly to the React page, so vanjs / Lit / Alpine arrivals aren't dead-ended. Framework-specific detection is intentionally NOT done.

## 10.6 Why not a tabbed view

Tabs collapse four URLs into one. The hub's primary delivery vector is search — "alpinejs vs ..." should land on the Alpine page, not the index with a tab pre-selected. Tabs also hide content from crawlers and make external linking unreliable. The cost of four pages is duplicate page chrome; the benefit is four indexable, link-shareable URLs that match real queries.

## 10.7 Per-framework history

KF-132 shipped the skeleton — the `/migrating/` index page with comparison matrix, the four original per-framework page stubs, the sidebar nav entry, and the hero CTA. KF-156 / KF-157 / KF-158 / KF-159 filled in the React / Alpine / Lit / vanjs pages. KF-189 expanded the set to cover Vue / Svelte / Solid / Preact / htmx / Angular / jQuery / Redux / Astro.

Each per-framework page writes one source framework's five sections (bundle, primitives, code, gotchas, perf) against the existing TodoMVC reference. The shape varies for frameworks where TodoMVC isn't the right reference — htmx, Redux, and Astro lean on conceptual mapping rather than a literal side-by-side; the Solid page is direct about kerf's perf ceiling vs Solid's.

## 10.8 Maintenance

- When the kerf TodoMVC example changes, the side-by-side code blocks on each `/migrating/<framework>/` page must be re-synced.
- When the source framework ships a major version (React 20, Lit 4, etc.), the bundle row in the comparison matrix and the per-page intro need a pass.
- The perf table on the index page mirrors `bench/results.md` — re-pull numbers after each benchmark re-run.

This doc is the canonical statement of what the hub is for. If the framing changes (different reference app, different page shape, dropping a framework, adding one), update this doc in the same change.

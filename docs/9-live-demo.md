# 9. Documentation site and live demo (GitHub Pages)

The documentation site at <https://brianwestphal.github.io/kerf/> and the
nine-section reactivity demo at <https://brianwestphal.github.io/kerf/demo/>
ship together as one static GitHub Pages artifact. There is no application
server or runtime API.

The documentation site is itself a production Kerf application. A small
repository-owned generator reads the hand-authored Markdown corpus and renders
all 52 public routes from Kerf JSX. The same shell uses `@kerfjs/ui`
`MenuHeader`, `MenuItem`, `Toolbar`, `PageHeader`, search states, and showcase
controls. After the first static page arrives, `kerfjs/router` updates browser
history and `morph()` swaps in the next pre-rendered page without reloading the
document.

## 9.1 What gets published

The artifact contains:

- `/kerf/` — 52 complete documentation pages, an explicit `404.html`, a legacy
  redirect, sitemap, icons, and a standalone Pagefind index.
- `/kerf/run/basics/<name>/` — nine isolated, Vite-built basic examples embedded
  by their corresponding guide pages.
- `/kerf/run/<name>/` — eleven complete example applications.
- `/kerf/demo/` — the separate nine-section interactive framework tour.

Every documentation URL is complete searchable HTML before JavaScript runs.
The client script adds SPA navigation, responsive navigation controls, search,
theme switching, and live homepage behavior.

## 9.2 Build pipeline

`npm run site:build` enters `site/`, installs its locked dependencies, and runs
the following pipeline:

1. `sync-docs` maintains the explicit map of internal versus published docs.
2. `build-examples` emits basic and complete applications under `public/run/`
   and copies the reactivity demo to `public/demo/`.
3. `build-icons` and `gen-llms-txt` generate public metadata assets.
4. `build-content` parses frontmatter and Markdown, expands the small set of
   repository-owned content directives, assigns heading anchors, and writes an
   ignored page-data artifact.
5. Vite bundles `site/src/scripts/site.tsx` and the shared stylesheet.
6. `site/scripts/render-site.tsx` renders every route through
   `renderSiteDocument()`, copies `public/`, and writes the 404, legacy redirect,
   and sitemap.
7. Pagefind indexes the completed static HTML under `site/dist/`.

The `/kerf` base is owned by the renderer and Vite config. Complete and basic
example bases are assigned per app in `site/scripts/build-examples.mjs`; the
reactivity demo keeps its own `/kerf/demo/` Vite base.

## 9.3 Client navigation and responsive shell

`site/src/scripts/site-view.tsx` is the shared server-rendered shell. Desktop
uses a persistent Kerf UI navigation sidebar and an on-page contents rail.
Tablet and mobile use the same sidebar as an off-canvas drawer, opened from the
Kerf UI toolbar; Escape, the scrim, a navigation choice, or the Close button
dismisses it. Mobile collapses cards and pagination into one-column layouts and
keeps tables/code horizontally scrollable.

`site/src/scripts/site.tsx` installs the postcard router. On an internal route
change it fetches that route's static HTML, parses `#site-root`, and asks
`morph()` to apply the smallest DOM change. A missing or non-document target
falls back to normal navigation, which is how the independent demo and runnable
apps leave the documentation shell. Pagefind is dynamically imported only
after the first non-empty search query.

## 9.4 Deployment

`.github/workflows/pages.yml` runs on every push to `main`:

1. Install and build the root Kerf package.
2. Run `npm run site:build` to produce the combined `site/dist/` artifact.
3. Upload the artifact with GitHub's Pages upload action.
4. Deploy from a separate least-privilege job with Pages/OIDC permissions.

GitHub Pages source must be configured once as **GitHub Actions** in repository
settings.

## 9.5 Install-script policy

The site enables npm's strict allow-scripts mode. The reviewed locked installer
set contains `esbuild` (allowed) and optional `fsevents` (denied); the linked
root package's repository-only `prepare` script is also denied.
`site/scripts/check-install-script-policy.mjs` runs during every install and
fails if dependency churn changes that set.

## 9.6 Local preview and verification

```bash
npm run build
npm run site:dev       # production build + Vite preview at /kerf/
npm run site:build     # build without starting a server
cd site && npm run test:e2e
```

The browser suite covers direct loading of every established URL, static HTML,
SPA history preservation, lazy search, live components, isolated examples, and
desktop/tablet/mobile navigation behavior.

## 9.7 Update triggers

Update this document whenever the base path, route renderer, Pages workflow,
example output layout, Pagefind integration, or responsive navigation contract
changes.

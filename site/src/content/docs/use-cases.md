---
title: Use cases
description: Reach for Kerf when… — concrete fits, with the reason each one works.
---

## Hybrid desktop apps (Tauri / Electron)

The embedded webview is constrained: bundle size matters, debuggability matters, the framework needs to *not* fight the host. kerf gives you a small bundle, a predictable diff that doesn't surprise you in DevTools, and a runtime that doesn't need a separate compiler step.

## Embedded widgets

Chat bubbles, comment boxes, support widgets, dashboards that drop into someone else's page. The host page may already have React, jQuery, Vue, or nothing. Adding 6.5 KB is reasonable; adding 200 KB is not.

## Server-rendered apps with islands

Rails, Phoenix, Django, Hono, Astro. The server renders the page; kerf adds reactivity to specific islands. `mount()` per island, `delegate()` for events. A turbo-frame swap or htmx update? Re-call `mount()` on the new root. The mental model maps cleanly onto every server-side framework.

## Admin panels & internal tools

Forms, tables, filters. The kind of UI that doesn't need a router-plus-state-lib-plus-data-fetcher cathedral. `signal` + `defineStore` + `mount` get you 90% of the way; the remaining 10% is your domain logic.

## Replacing jQuery

You already have a jQuery codebase that works. Replacing it with React is a rewrite. Replacing it with kerf is incremental — the `delegate()` mental model is what jQuery's `.on()` already taught you, and you can migrate one section at a time. Modern primitives, similar leverage, no big-bang.

## Prototyping

The entire mental model fits on a postcard:

```
signal()  →  computed()  →  mount(el, () => <jsx>)  →  delegate(root, type, sel, h)
```

Spin up a single-file `<script type="module">` page with kerf and you're reactive in five minutes. No bundler dance, no project-template ceremony.

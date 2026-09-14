---
title: When to reach for something else
description: Honest pointers to other frameworks for jobs kerf isn't the right tool for.
---

kerf is small on purpose. There are jobs it deliberately doesn't try to do. Here's where to go instead.

## Need a full ecosystem (router + forms + data + SSR streaming)

→ **[Next.js](https://nextjs.org/)** · **[Remix](https://remix.run/)** · **[SolidStart](https://start.solidjs.com/)**

If your project genuinely needs file-based routing, a forms library with progressive enhancement, a built-in data-loading story, and SSR streaming with hydration — you want a full meta-framework. That's not kerf's brief.

## Building a deeply componentised design-system app

→ **[React](https://react.dev/)** · **[Solid](https://www.solidjs.com/)** · **[Svelte](https://svelte.dev/)**

If your app is built around a `<DataGrid>` / `<DatePicker>` / `<Combobox>` component library with deep prop drilling, instance state, and hooks-based lifecycle — kerf's "components are functions returning HTML strings" model will fight you. Use a real component framework.

## Need React Native / cross-platform mobile

→ **[React](https://react.dev/)** (with React Native)

kerf is web-only. The runtime targets the DOM directly. *(Note: kerf + Tauri or Electron also covers many cases that get reflexively reached-for as "I need React Native" — don't dismiss it without checking.)*

## Building a static site

→ **[Astro](https://astro.build/)**

If the page is fundamentally content (docs, marketing, a blog), Astro will out-deliver everyone. Use Astro for the shell and drop kerf into specific interactive islands if you need them. (We do exactly that for [this site](https://github.com/brianwestphal/kerf/tree/main/site).)

---

## When you're not sure

- **Bundle-size matters more than ecosystem breadth?** kerf.
- **Bundle-size matters AND you need deep components?** [Solid](https://www.solidjs.com/) (similar reactivity model, real components).
- **You're already React-shaped?** Stay React. The cost of switching usually exceeds the cost of 200 KB.
- **You want to see what "no framework" looks like in 2026?** kerf.

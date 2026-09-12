---
title: 3 · Store
description: defineStore — same cart, named state and actions.
---


A store is a thin convention layer over signals: named actions, a predictable shape, and `reset()` for free. Use stores when state has multiple consumers or when actions are non-trivial.

**What to look at:** the render fn reads `cart.state.value`, never the raw signal. Mutations go through `cart.actions.*` — there's no `set()` exposed to the outside world.

<LiveExample />

<Code lang="tsx" code={source} title="src/main.tsx" />

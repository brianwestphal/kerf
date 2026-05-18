---
title: Coming from Angular
description: An honest comparison of Angular and Kerf — when each is the right tool. Angular's batteries-included philosophy vs kerf's tiny-runtime, bring-your-own approach.
---

You wrote an Angular app. You're reading this because you're considering a smaller, less opinionated stack for a new project, or because a specific part of an Angular app needs to live as an independent widget. This page is unusually direct about a mismatch: **Angular and kerf solve very different problems, and a literal migration usually isn't the right move.** If you're shipping the same codebase you have today, you're not the audience for this page. If you're starting something new and weighing the cluster, read on.

## 1. The two tools, plainly

**Angular** is a full application framework — components with templates, dependency injection, a router, forms, HTTP, an animations library, a CLI, structural directives, change detection (Zone-based historically, signals-based in modern Angular), and an opinionated TypeScript-first architecture. It's batteries-included by design.

**Kerf** is a 6.5 KB reactive runtime — signals, a DOM morph, JSX, and a delegation-based event system. It has no router, no forms library, no HTTP wrapper, no DI, no CLI, no testing framework. You bring those (or don't, if your app doesn't need them).

These two are not the same kind of tool. Kerf doesn't try to be Angular-minus-a-few-features; it's a different category — a runtime, not a framework.

## 2. When Angular wins

- **Enterprise apps with strict architectural conventions.** Angular's DI, modules, and CLI scaffolding scale to large teams in a way kerf actively doesn't try to.
- **You need a router, forms, HTTP, and animations as one coherent thing.** Angular ships these; kerf doesn't.
- **The team already knows Angular.** Switching costs always dominate framework choice. If your team is fluent in Angular, kerf's gains don't pay for the re-learning.
- **You want signals *and* a full ecosystem.** Angular's signal-based reactivity (post-v16) is mature and integrated with the rest of the framework. Kerf has the signal-based reactivity but not the ecosystem.

## 3. When kerf wins (the specific cases)

- **You're carving an interactive widget out of a server-rendered page.** Kerf is small enough to drop into a Rails / Django / Phoenix page without doubling the bundle. Angular is not.
- **You want to read the entire framework end-to-end.** Kerf's source is ~2000 lines including comments. Angular's runtime is orders of magnitude more.
- **You don't need DI, modules, or any of the architectural ceremony.** For small apps, the ceremony is overhead.
- **You want no compiler step beyond standard JSX.** Angular's template compiler is part of the build; kerf has no plugin.

## 4. Mental-model translations (the partial overlap)

| Angular | Kerf | Notes |
| --- | --- | --- |
| `signal(0)` (v16+) | `signal(0)` | Conceptually the same — Angular's signals are a different implementation but the same model. Reads are `s()`; kerf is `s.value`. |
| `computed(() => ...)` | `computed(() => ...)` | Same. |
| `effect(() => ...)` | `effect(() => ...)` | Same. |
| `@Component({ template, selector })` | plain function returning JSX | No component decorator, no selector, no template DSL. |
| `*ngFor="let item of items; trackBy: trackByFn"` | `each(items, render, key)` plus `data-key={item.id}` | The `trackBy` function corresponds to the `data-key` attribute (DOM-identity) — kerf adds a second key for row-memoization. |
| `*ngIf="cond"` | `cond ? <a/> : <b/>` | JSX ternaries. |
| `[class.done]="todo.done"` | `class={todo.done ? 'done' : ''}` | Template-literal class binding. |
| `(click)="handler($event)"` | `delegate(root, 'click', '[data-action="..."]', handler)` | One listener at the root; survives every re-render. |
| `[(ngModel)]="x"` | `value={x.value}` + `delegate('input', ...)` | No two-way binding sugar. |
| `@Injectable()` services + DI | module-level `defineStore` or imported singletons | No DI container. Import the module that exports the singleton. |
| `RouterModule` | bring your own router | Kerf has no router. `wouter`, `nanoroute`, or your server. |
| `ReactiveFormsModule` | manual: `signal()` per field + validators as plain functions | No forms library. |
| `HttpClient` | `fetch()` | No HTTP wrapper. |

## 5. Gotchas (the mental shifts)

**No DI, no `providedIn: 'root'`, no `inject()`.** Angular's DI is one of its defining features — kerf has nothing of the kind. Singletons are module exports; "scoping" a singleton to a feature area is your responsibility (file structure, naming). For most non-enterprise apps this is freeing; for large teams it's a missing guardrail.

**No template DSL.** No `*ngFor`, `*ngIf`, `*ngSwitch`, `*ngTemplateOutlet`, `[ngClass]`, `[ngStyle]`, `(click)`, or any structural directive. JSX expressions cover the same surface (ternaries for `*ngIf`, `each()` for `*ngFor`, template literals for `[ngClass]`) but the form is different. The mental adjustment is moving from "annotations on HTML" to "expressions in JSX."

**No two-way binding.** Angular's `[(ngModel)]` is render + write-back in one annotation. Kerf is explicit: `value={signal.value}` for the read direction, `delegate('input', ...)` for the write-back. More lines; every wire is visible.

**No `OnPush` change detection.** Angular's `ChangeDetectionStrategy.OnPush` is a performance optimization to opt out of zone-based dirty checking. Kerf's signals are the kerf equivalent — only the render functions whose read-signals changed re-run.

**No `ngOnInit` / `ngOnDestroy` / `ngOnChanges`.** Setup runs at module load or inside the `mount(root, () => ...)` callback's first invocation. Teardown returns from a top-level `effect()` (`const stop = effect(...); stop()`).

**Components are calls, not declarations.** `<MyComponent props />` works in kerf JSX — it calls `MyComponent(props)` and uses the returned JSX — but there's no instance, no decorator, no lifecycle. The Angular component model fundamentally does not translate.

**You write your own router / forms / HTTP.** This is the major switching cost. Whatever you used Angular's modules for, you'll need to find (or write) a kerf-compatible equivalent. Pick `wouter` / `nanoroute` for routing, plain `fetch()` for HTTP, plain validators-as-functions for forms.

## 6. Perf numbers

Cross-framework perf comparisons are only published from official benchmark runs — clean machine, no background load, results re-generated under controlled conditions. Angular isn't currently in the kerf comparison set in `bench/results.md`; on the public krausest leaderboard, Angular's signal-based change detection is competitive with the cluster kerf sits in. The deciding factor between the two frameworks is the framework / runtime tradeoff in §1–§5, not row-update latency.

[See the kerf bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)

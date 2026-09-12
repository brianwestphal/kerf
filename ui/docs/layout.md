# Spacing and application layout

Kerf UI's six-step spacing scale is the source of every application-layout
distance. Import `@kerfjs/ui/layout.css`, put `.kui-layout` on the composition
root, and choose a semantic owner instead of copying a numeric value.
The manual CSS subpath includes stable fallbacks, so it also works when an
application delivers `layout.css` without the complete foundation layer.

## Decision table

| Need | Token | Owning class | Default | Compact / narrow |
| --- | --- | --- | --- | --- |
| Page edge gutter | `--kui-layout-page-gutter` | `.kui-page-gutter` | `xl` | `m` |
| Pane content inset | `--kui-layout-pane-inset` | `.kui-pane-body` | `m` | `s` |
| Major section rhythm | `--kui-layout-section-gap` | `.kui-section-stack` | `l` | `m` |
| Related controls | `--kui-layout-control-gap` | `.kui-control-cluster` | `xs` | fixed |
| Inline metadata | `--kui-layout-metadata-gap` | `.kui-inline-metadata` | `2xs` | fixed |
| Card or bordered surface body | `--kui-layout-surface-inset` | `.kui-surface-body` | `m` | `s` |
| Dialog body | `--kui-layout-dialog-inset` | `.kui-dialog-body` | `l` | `m` |
| The one scrolling region in a pane | — | `.kui-scroll-owner` | `overflow: auto` | unchanged |

The scale itself remains `2xs`, `xs`, `s`, `m`, `l`, and `xl`. Semantic
variables make intent stable when an application changes density or theme.
They do not replace deliberate component-internal geometry such as hit targets,
icons, split handles, or borders.

## Ownership rules

1. One boundary owns one inset. Do not put `.kui-pane-body` and
   `.kui-surface-body` on the same element or wrap either in another padded
   copy of itself.
2. `Toolbar`, `PageHeader`, and `DialogHeader` own their chrome. Put the body
   class on their following content, not around the header.
3. A bordered surface owns its border; one `.kui-surface-body` inside or on the
   surface owns its content inset. Nested cards do not accumulate wrapper
   padding merely to look centered.
4. Use `.kui-section-stack` between major content groups,
   `.kui-control-cluster` between related controls, and
   `.kui-inline-metadata` only for compact supporting facts.
5. Each pane has at most one `.kui-scroll-owner`. Its fixed header and footer
   remain siblings outside that owner. Do not make the document, pane, and list
   compete for the same vertical gesture.
6. Reading width and centering are application decisions. If prose needs a
   measure, declare one named application variable at its page boundary; do not
   give unrelated panes arbitrary `max-width` and `margin: auto` values.

```tsx
<main class="kui-layout">
  <Toolbar label="Workspace" leading={title} trailing={actions} />
  <section class="kui-scroll-owner">
    <PageHeader title="Projects" />
    <div class="kui-page-gutter kui-section-stack">
      <article class="project-surface kui-surface-body">...</article>
    </div>
  </section>
</main>
```

```css
/* Correct: one named adaptation at the composition boundary. */
.project-shell {
  --kui-layout-page-gutter: var(--kui-space-l);
}

/* Incorrect: two owners and a one-off compensation. */
.project-page { padding: 1.25rem; }
.project-page > .card { padding: .8rem; margin-inline: -.35rem; }
```

## Responsive behavior

At `48rem` and below, `.kui-layout` reduces page, pane, surface, section, and
dialog spacing by one deliberate step. `.kui-layout--compact` selects the same
density at any width; `.kui-layout--fixed-density` prevents the automatic
responsive reduction when a specialized embedded surface must remain fixed.
Control and metadata gaps do not compress: controls wrap, stack, or relocate
before their targets become crowded.

At narrow widths, application structure may relocate a sidebar or inspector,
but the destination still owns exactly one inset and one scroll region. At
200% browser zoom the reduced CSS viewport should naturally take the same path.
Test overflow and focus order as well as screenshots; visual scale alone does
not prove ownership.

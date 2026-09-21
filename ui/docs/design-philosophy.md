# Kerf UI design philosophy

Kerf interfaces should feel calm, legible, stable, and honest. They protect the user's train of thought while data and automation continue around them. Visual emphasis is spent only where it helps a person decide or act.

## Decision order

When concerns compete, use this order:

1. Explicit product intent and user direction.
2. Continuity, data safety, and truthful behavior.
3. Accessibility and platform conventions.
4. Shared semantic systems and component contracts.
5. Local visual polish.

A reference image defines hierarchy, relationships, and intended feel. It does not require brittle pixel copying. Responsive adaptations may change presentation while preserving reading order, grouping, emphasis, and actions.

## Principles

### Continuity is correctness

Unrelated updates must not close controls, move focus, reset a draft, replace a selection, or jump scroll. Give every durable and transient state an explicit owner. The default owner is the application: domain data and persisted layout preferences — a navigation stack, a selection, a tab order, a pane size, a `collapsed`/`expanded` disclosure flag — are the app's signals, which it reads to render. A `wire…` helper owns only the _ephemeral mechanics_ around that state (a push/pop animation, overflow autoscroll, a live resize preview) and reports committed changes through callbacks. A helper takes over a piece of transient state itself only when hand-rolling that behavior is substantial and error-prone enough to cause real, inconsistent variation across apps — `wireTokenSearchFields`'s collapsible reveal/focus/Escape/blur-collapse is the bar; a one-line boolean toggle is not. Preserve DOM identity when meaning has not changed. Distinguish blocking foreground work from background synchronization.

### Hierarchy precedes decoration

Establish one reading order and one dominant action per decision point. Group first with alignment, spacing, typography, and shared surfaces. A border, fill, badge, or nested card must communicate a real distinction.

### Reach for the primitive, not for CSS

The package is designed to look right _unstyled_. A screen built from the
primitives, their props, and the semantic tokens should already read well, so
custom CSS is the exception. Before adding any `padding`, `margin`, `width`,
`height`, `border`, `background`, wrapper card, or decoration, check whether the
component, the pane, or the content-item already owns it — it almost always does,
and adding more usually **double-insets** or fights the component (the most common
mistake). Trust component defaults: render a control at its natural size and color
and fix the surrounding layout rather than overriding the control. Legitimate
custom CSS is limited to genuinely new structure, and even then may only join a
component's documented `publicClasses` or override documented `--kui-*` tokens at a
real composition boundary — never size, space, or re-skin a primitive by hand, and
never build a heading, toolbar, card, or pane geometry that a primitive provides.

### Panes share one child-owned geometry

Sidebars, main areas, inspectors, and dialogs use the same unpadded pane. Their
children own margin, border, background, padding, and radius, so a transparent
surface occupies exactly the same geometry as a visible one. Major content
groups use 24px vertical separation; the inside of an item and the gap between
toolbar groups use 8px. Rows and actions keep 44px targets.

Use the package composition so the geometry has one owner:

```tsx
<Pane element="aside" contentElement="nav" label="Workspace" contentLabel="Workspace pages">
    <section>
      <ListHeader label="Workspace" />
      <ListItem action="open" label="Inbox" icon={inboxIcon} />
      <ListItem action="open" label="Drafts" />
    </section>
    <div class="kui-content-item">Panel contents</div>
</Pane>
```

Do not pad the pane and then pad every wrapper. That duplicates the geometry
and makes transparent borders behave differently from visible ones:

```tsx
<aside class="pane padded">
  <section class="padded">
    <ListHeader label="Workspace" />
    <div class="panel padded-again">Panel contents</div>
  </section>
</aside>
```

Change the shared item tokens at a real composition boundary when a product
needs different geometry; do not compensate with one-off negative margins.

### Prefer directness

Use the shortest understandable, recoverable interaction. Avoid modes, dialogs, confirmations, and explicit saves when direct manipulation can safely express the same result. Low ceremony still requires a discoverable affordance, visible focus, and honest feedback.

### Components encode meaning

Reuse a component when surfaces share its purpose, anatomy, state model, and interaction behavior—not merely its appearance. Components expose semantic actions and explicit variants. Product-specific copy, transport, persistence, and domain states stay in application adapters.

### Use a finite vocabulary

Color, type, spacing, radius, elevation, and motion express semantic roles. Prefer package tokens over raw values in consuming code. State is never communicated by color alone.

The default vocabulary is opinionated rather than empty: neutral, brand/info,
success, warning, and danger provide quiet/normal/loud fills, borders, and
foregrounds compatible with Hot Sheet 2 and Web Awesome. Consumers may replace
the global palette, one semantic role, or one component instance through
documented custom properties without rewriting component CSS.

Spacing is likewise a finite, semantic scale, not a free measurement. Five
canonical steps — 0, 4, 8, 16, and 24px, each a `--kui-space-*` token — map to a
single relationship apiece, chosen by how connected two elements are: no
separation, very minor air, standard within a group, between homogeneous groups,
and major between heterogeneous groups. Off-scale values (12px, 32px) are
deliberate exceptions. See [`layout.md`](layout.md) "Spacing scale".

### Responsive design reprioritizes

Protect primary content, readable type, recognizable icons, and usable targets. Relocate secondary information before compressing it below a usable scale. Keep one clear scroll owner per region and test narrow, wide, zoomed, and intermediate layouts.

### Production behavior is proof

The catalog uses the same exports and CSS consumers receive. Its category-grouped master/detail layout keeps one component under review at a time, and its decorative shell consumes the same semantic palette as the component stage. Every public visual primitive has a focused route; composition demos declare their direct dependencies so reviewers can navigate both `Uses` and `Used by` relationships. Every enabled control works. Demonstrations cover meaningful variants and adverse states with realistic enough content to expose wrapping, clipping, density, and state-transition defects.

### Be platform-fluent, not platform-costumed

Use honest web primitives in the browser. Translate platform behavior and accessibility conventions; do not counterfeit native title bars, materials, or controls that cannot behave natively. The web package is HIG-shaped, not HIG-skinned.

### Performance is interaction design

Acknowledge actions within the interaction frame. Keep blocking work out of pointer, keyboard, resize, drag, and animation frames. Bound observers, listeners, caches, and retained resources; dispose them with their owning surface.

### AI remains accountable to people

AI-generated or AI-modified content needs persistent factual attribution where it matters, clear uncertainty, and adjacent human controls such as Edit, Undo, Retry, or Reject. Never use humanlike decoration to substitute for provenance or review.

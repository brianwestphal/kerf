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

Unrelated updates must not close controls, move focus, reset a draft, replace a selection, or jump scroll. Give every durable and transient state an explicit owner. Preserve DOM identity when meaning has not changed. Distinguish blocking foreground work from background synchronization.

### Hierarchy precedes decoration

Establish one reading order and one dominant action per decision point. Group first with alignment, spacing, typography, and shared surfaces. A border, fill, badge, or nested card must communicate a real distinction.

### Prefer directness

Use the shortest understandable, recoverable interaction. Avoid modes, dialogs, confirmations, and explicit saves when direct manipulation can safely express the same result. Low ceremony still requires a discoverable affordance, visible focus, and honest feedback.

### Components encode meaning

Reuse a component when surfaces share its purpose, anatomy, state model, and interaction behavior—not merely its appearance. Components expose semantic actions and explicit variants. Product-specific copy, transport, persistence, and domain states stay in application adapters.

### Use a finite vocabulary

Color, type, spacing, radius, elevation, and motion express semantic roles. Prefer package tokens over raw values in consuming code. State is never communicated by color alone.

### Responsive design reprioritizes

Protect primary content, readable type, recognizable icons, and usable targets. Relocate secondary information before compressing it below a usable scale. Keep one clear scroll owner per region and test narrow, wide, zoomed, and intermediate layouts.

### Production behavior is proof

The catalog uses the same exports and CSS consumers receive. Every enabled control works. Demonstrations cover meaningful variants and adverse states with realistic enough content to expose wrapping, clipping, density, and state-transition defects.

### Be platform-fluent, not platform-costumed

Use honest web primitives in the browser. Translate platform behavior and accessibility conventions; do not counterfeit native title bars, materials, or controls that cannot behave natively. The web package is HIG-shaped, not HIG-skinned.

### Performance is interaction design

Acknowledge actions within the interaction frame. Keep blocking work out of pointer, keyboard, resize, drag, and animation frames. Bound observers, listeners, caches, and retained resources; dispose them with their owning surface.

### AI remains accountable to people

AI-generated or AI-modified content needs persistent factual attribution where it matters, clear uncertainty, and adjacent human controls such as Edit, Undo, Retry, or Reject. Never use humanlike decoration to substitute for provenance or review.

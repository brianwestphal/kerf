# Translating Apple HIG principles to Kerf UI

Native Apple applications should use native platform controls and follow the Human Interface Guidelines directly. `@kerfjs/ui` is a web package: it translates the HIG's interaction, hierarchy, writing, accessibility, and feedback principles into semantic HTML and CSS. It does not imitate macOS chrome or materials.

## Foundations

- Accessibility is behavior: every workflow is keyboard-operable; focus is visible; DOM and reading order agree; controls have accessible names; decorative icons are hidden.
- Use adaptive semantic colors. Every custom role needs usable light, dark, and increased-contrast behavior. Never rely on color alone.
- Use the system UI font stack and allow browser zoom through 200%. Avoid thin weights and hard minimums that clip enlarged text.
- Group with space and alignment before adding borders. Keep essential content in the leading reading path and secondary detail in progressive disclosure.
- Use one icon family and one metaphor per action. Directional icons may mirror in RTL; checkmarks, logos, and real-world objects do not.
- Motion is brief, causal, and optional. Honor reduced-motion and reduced-transparency preferences; repeating indicators stop moving under reduced motion.
- Writing is concise, specific, and action-led. Labels describe the result, not implementation details.

## Interaction

- Prefer native buttons, links, headings, lists, and form controls so browser keyboard behavior comes for free.
- Use 28 px targets by preference, 20 px as the absolute package floor, and 44 px where the layout allows.
- Do not move focus after background updates. After a destructive foreground action, move it predictably to the nearest logical survivor.
- Distinguish selection, focus, pressed, disabled, pending, success, and failure in both semantics and presentation.
- Use `role="status"` for passive updates. Reserve `role="alert"` for failures requiring attention.
- Do not timer-dismiss essential feedback. A transient notice that disappears must not be the only record of an important outcome.
- Place controls near the content they affect. Avoid modal presentation when an inline or popover interaction preserves context safely.
- Use segmented controls for a small set of mutually exclusive modes. Keep every choice named and keyboard reachable, make the selected mode visible without relying on color alone, and choose rounded or pill geometry to fit the surrounding toolbar or content surface.

## Layout and appearance

- Browser surfaces are HIG-shaped, not HIG-skinned: no fake traffic lights, title bars, SF Symbols, or CSS imitation of Liquid Glass.
- Logical CSS properties support language direction. Truncation and wrapping decisions are explicit; identifiers retain useful leading and trailing context.
- At constrained widths, remove or move secondary information before shrinking controls or text below usable sizes.
- Test light, dark, increased contrast, reduced motion, keyboard-only use, 200% zoom, and narrow/wide layouts.

## AI experiences

- Identify AI-generated or AI-modified content when that fact affects trust or review.
- State meaningful uncertainty and consequences in plain language.
- Keep people in control with reviewable changes and adjacent Edit, Undo, Retry, Reject, or Report actions.
- Do not use anthropomorphic animation or decoration to imply confidence, agency, or authorship.

These rules are a portable implementation guide, not a replacement for current Apple documentation when building a native client.

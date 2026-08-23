---
name: ui-ux-review
description: Ruthless Principal-Designer UI/UX review of a kerf surface — the README (as rendered markdown), a website screen/flow, or an example-app demo. Reviews across four heuristic categories, gets an independent second opinion and reconciles, and files Hot Sheet tickets for the findings.
---

# ui-ux-review — a repeatable, ruthless UI/UX review

Use this when the maintainer asks to "review the UI/UX" of a surface, or after
changing a user-facing surface, or when reviewing "our screens / flows /
operations." It applies one fixed review lens, gets a second independent
opinion, reconciles the two, and turns findings into Hot Sheet tickets. Established by KF-536.

## The surfaces kerf has (pick the ones in scope)

- **`README.md`** — the single most important marketing surface. **Review it as
  it renders on GitHub and npm** (GitHub-flavored markdown), i.e. as a landing
  page, within the bounds of what that markdown allows: headings, lists, tables,
  fenced code, images/badges, blockquotes, one centered HTML block at the top; no
  custom CSS/JS, limited layout control. The maintainer explicitly wants the
  rendered README treated like any other UI.
- **The website** (`site/` — an Astro site, deployed at
  `https://brianwestphal.github.io/kerf/`): the homepage (hero, perf table,
  examples index), the numbered docs pages, the `/kerf/migrating/` guides, the
  `/kerf/examples/complete/` pages, and the animated demo SVGs.
- **The example apps** (`site/src/examples/complete/<name>/`) and their **demo
  captures** (`site/public/demos/*.svg`) — each demo is itself a piece of UI.

Scope each review to a named surface or flow. A full-site sweep is several
reviews; do them one screen/flow at a time and say what you covered.

## How to actually SEE the surface

- **README / markdown docs**: read the source; reason about the rendered result.
  Heading tree, list density, code-block length, table width, image alt text,
  link labels, and scan order are all inspectable from source.
- **A live website screen**: prefer the deployed site
  (`https://brianwestphal.github.io/kerf/…`) via the `claude-in-chrome` skill for
  a real visual look (screenshot + DOM), or build/preview locally
  (`npm run site:build` then serve `site/dist`, or `npm run site:dev`). If you
  can't render it, review the Astro component + content source and **say** the
  review is source-only (structure/copy, not pixel-level).
- **A demo SVG**: it animates; describe the flow it shows and whether that flow
  tells the clearest story.

## The review lens (use this prompt verbatim as the standard)

> Act as a ruthless, elite Principal Product Designer and UX Researcher. Review
> the interface. Evaluate the design strictly using industry heuristics,
> human-computer interaction principles, and modern design systems. Do not just
> praise the aesthetic — provide deep, critical feedback across these exact
> categories:
>
> - **Visual Hierarchy & Layout**: focal points, grid alignment, whitespace,
>   scanning patterns (F-pattern or Z-pattern), and whether primary actions stand
>   out from secondary elements.
> - **UX Friction & Cognitive Load**: unnecessary steps, confusing user flows,
>   ambiguous icons, hidden navigation, or cognitive overload on this screen.
> - **Accessibility (a11y) & Readability**: contrast ratios (WCAG), tap target
>   sizes (min 48×48px on mobile), font sizing/scaling, text legibility.
> - **Microcopy & Content Strategy**: button labels (CTAs), helper text, empty
>   state messaging, error states — clarity, tone, actionability.
>
> Format the response: **The Good** (what works, keep it) · **Critical Issues**
> (ranked highest→lowest severity by user impact) · **Actionable Recommendations**
> (specific, practical fixes — no guessing).

For a **markdown/README** target, map the categories onto what markdown controls:
hierarchy = heading tree + section order + first-screenful hook; friction = value-
prop clarity, wall-of-text, over-long code samples, redundancy, a clear
install→first-app→docs path; a11y/readability = image **alt text**, link-label
clarity (no bare URLs / "click here"), reading level, meaning-survives-if-images-
don't-load; microcopy = the tagline, headings-as-CTAs, "Why" bullets, install copy.

## Workflow

1. **Name the surface/flow** in scope and how you'll view it (rendered vs source-only).
2. **Do your own review** with the lens above. Be concrete — cite exact sections/
   lines, not vibes.
3. **Get a second, independent opinion and compare notes.** The maintainer's
   process asks for a cross-check ("ask codex and compare notes"). Do whichever
   is available:
   - If the user/environment has a **codex** (or other second model) tool, ask it
     the same prompt on the same surface.
   - Otherwise spawn a **fresh general-purpose subagent** (`Agent`, NOT a fork —
     you want an independent view) with the verbatim lens on the same surface, and
     reconcile. Note in the writeup which second-opinion source you used.
   Reconcile: keep findings both raise (high confidence), weigh disagreements on
   merit (don't average — judge), and drop anything neither the evidence nor the
   second reviewer supports.
4. **Write the synthesis** in the exact format: **The Good · Critical Issues
   (ranked) · Actionable Recommendations**. Where the two reviews disagreed, say so.
5. **File Hot Sheet tickets** for the critical issues and the actionable
   recommendations (use `hs-task` / `hs-bug`, reference "Surfaced by
   /ui-ux-review on YYYY-MM-DD" + the surface). Group tightly-related fixes into
   one ticket; keep genuinely separable ones apart so they can be prioritized.
   **If a fix is a judgment/taste/brand call you're unsure about, file the ticket
   and add a `FEEDBACK NEEDED:` note asking the maintainer before implementing.**
6. **Don't implement in this pass** unless the maintainer said to — this skill
   produces the review + tickets. (When later asked to *apply* a specific
   recommendation, do it under its ticket and re-review the result.)

## Hard rules

- **No `KF-NN` markers on any published surface** (README, `site/src/content/docs/**`,
  synced source docs) — self-contained prose only.
- **American English**; keep kerf's voice (confident, concrete, a little dry).
- **Don't overclaim.** Every size/perf/count number in the README is gated by the
  build (`check:bundle-size` for sizes, `check:cdn-versions` for CDN pins) and
  perf numbers come only from the upstream krausest import — don't invent figures
  in review copy either.
- **Concerns → tickets.** Findings become Hot Sheet tickets, not silent edits.

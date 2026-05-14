---
title: 'AI evidence: what we publish so the claims are checkable'
description: 'A landing page for every kind of AI-first evidence kerf publishes — structural, operational, empirical, and diagnostic — plus the honest caveats on the comparison set.'
---

kerf claims to be the easiest reactive UI framework for an AI to write code in. That claim should be falsifiable, not vibes. This page is the entry point to every kind of evidence we publish so a reader can decide for themselves how much weight to put on it. The framing comes from the launch essay [Predictable performance, low complexity, small as a side effect](/kerf/blog/predictable-performance/) — read that first if you want the why; this page is the where.

## The four layers

### Structural — *what's measurable without running a model*

The intrinsic properties of each framework that predict AI-friendliness independent of any one model run: minimum documentation to write correct code, hidden-rule count, public-API surface, render-path steps. Side-by-side across kerf, React, Solid, Svelte, Vue, vanjs, Lit, and Alpine.

→ [AI evidence: structural](/kerf/ai-evidence/structural/)

### Diagnostic — *what the model sees when it gets a rule wrong*

For each of kerf's 12 hard rules, a fixture that deliberately violates the rule, run under happy-dom, with the error scored 0–3 on actionability. Pinned by a runtime test so the page and the audit can't drift apart. Includes the post-fix promotions from KF-173 (each-row missing-key warn), KF-174 (rebuilt-listener observer, opt-in), KF-175 (nested-mount throw), KF-176 (untracked-signal-write warn, opt-in), KF-177 (frozen `get()` snapshot for store actions), and KF-178 (dedicated `onX={fn}` error pointing at `delegate()`).

→ [AI evidence: diagnostics](/kerf/ai-evidence/diagnostics/)

### Operational — *what the model produces from a prompt + the docs we ship*

A portfolio of one-shot transcripts: kanban, todoMVC, dashboard, markdown editor, streaming chat — re-derived from prompt-only against a pinned kerf version, a pinned model, and a pinned `llms.txt` revision. When the model gets something wrong, the transcript shows it.

*In progress.* The [built-by-an-ai Pomodoro](/kerf/examples/complete/built-by-an-ai/) is the precedent; the rest of the portfolio is the work tracked in the AI-evidence epic.

### Empirical — *what the model produces across frameworks, models, prompts, and doc conditions*

A krausest-style benchmark, but for *making the framework work* rather than for row-update latency. Cells are framework × model × prompt × doc-condition; scoring covers compile / mount / headline-interaction / token cost / iterations to working / subtle-bug presence. The doc-condition axis is the falsification test for the self-fulfilling-docs effect.

*In progress.* The design lives at the AI-evidence epic; once shipped, the leaderboard is at `/kerf/ai-bench/` and refreshes per kerf release.

## Honest caveats

- **The niche is a single engineer working with an AI agent.** That is the user we shape for. Big-team frameworks (React, Vue) optimize for different things; this evidence is not an argument that kerf is better at those.
- **The training-set bias is real.** Models have seen orders of magnitude more React than kerf. The structural numbers are unaffected by that bias; the operational and empirical numbers will partly reflect it. The empirical layer's doc-condition A (no docs fetched) is the falsification test — if kerf is competitive there too, the result is honest; if kerf loses on A and wins on B/C, the doc-fetch is doing the work.
- **The self-fulfilling-docs effect.** kerf's `docs/ai/usage-guide.md` is written *for* an LLM to fit and reason about. That's a deliberate shape, but it does mean the documentation is part of what we're measuring. The empirical layer's doc-condition axis exists to surface this rather than hide it.
- **The diagnostic-error audit is fixture-based.** Each rule has one captured violation under happy-dom; real codebases vary. The pinned tests guard against the framework regressing — but they don't claim the AI sees every misuse this clearly in every real-world variant.
- **Diagnostic promotions under opt-in env vars are opt-in.** KF-174 (`KERF_DEV_WARN_REBUILT_LISTENERS`) and KF-176 (`KERF_DEV_WARN_UNTRACKED_SIGNALS`) ship the warning behind a flag because the underlying heuristics can produce false positives in real codebases (third-party widgets calling `addEventListener` inside a mount tree, purely-imperative signals with no UI consumer). The default-mode audit score reflects the off-by-default behavior.

## Further reading

- [Launch essay — predictable performance, low complexity, small as a side effect](/kerf/blog/predictable-performance/)
- [AI page](/kerf/ai/) — system prompt and copy-paste setup for using kerf with an LLM agent
- [`docs/ai/usage-guide.md`](https://github.com/brianwestphal/kerf/blob/main/docs/ai/usage-guide.md) — the canonical AI-first reference
- [`docs/ai/code-summary.md`](https://github.com/brianwestphal/kerf/blob/main/docs/ai/code-summary.md) — reverse index of every public export

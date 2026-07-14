---
name: kerf
description: Read the kerf Hot Sheet worklist and work through the current priority items
---

# kerf — work through Up Next items

This skill is the kerf-specific equivalent of Hot Sheet's stock `/hotsheet` skill. It reads the local worklist and works through whatever is in the Up Next bucket.

## Workflow

1. Read `.hotsheet/worklist.md` for the current Up Next list. (Skip the channel server's Up Next semantics — kerf doesn't run a Claude channel.)
2. For each ticket in priority order:
   - Mark it `started` via the Hot Sheet API.
   - Implement the work, following the conventions in `CLAUDE.md`.
   - Run the gates: `npm run typecheck`, `npm run lint`, `npm test`. All must pass.
   - Mark the ticket `completed` with notes summarising what shipped.
3. Stop when the Up Next list is exhausted OR when a ticket needs feedback.

## Hard rules

- Commit completed, verified work as needed (e.g. one commit per finished ticket, after the gates pass) — no need to ask first. **Never `git push` without the maintainer's explicit permission.**
- Never modify code under `dist/`, `node_modules/`, or `coverage/` — those are build outputs.
- Run `npm test` (NOT individual `npx vitest` calls) before marking anything complete — the coverage thresholds in `vitest.config.ts` are enforcement, not suggestion.
- Update the relevant `docs/N-foo.md` file whenever you change the API surface, AND `docs/8-api-reference.md`, AND `CHANGELOG.md`'s `[Unreleased]` section.

## When something needs feedback

If you finish exploring a ticket and the right answer is unclear, leave it `started` and add a `FEEDBACK NEEDED:` note via the API. Do NOT close the ticket with the question buried in the notes — the user can't see it that way.

## Reference

- Public exports + behaviour: `docs/8-api-reference.md`
- Architecture overview: `docs/1-overview.md`
- Hot Sheet API for ticket updates: `.hotsheet/worklist.md` documents the curl commands.

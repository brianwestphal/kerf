---
name: check-requirements-against-code
description: Compare the project's requirements documents against every implementation surface, synchronize the AI synthesis documents (codebase map, requirements summary, feature coverage record) in place, verify AGENTS.md matches the real commands and gates, and report every discrepancy with a ticket.
allowed-tools: Read, Grep, Glob, Bash, Agent, Edit, Write
---

<!-- ai-playbook:skill name=check-requirements-against-code v=1 -->

Compare the requirements documents against the actual implementation across every surface the
project has, then fix the synthesis documents in place and report what the code and the docs
disagree about. The `hotsheet-requirements-documentation` rule makes the human-readable
requirements the source of truth and asks every project to keep two concise AI-readable
synthesis documents, a codebase map and a requirements summary, at repository-relative
locations recorded in its instructions. Find those locations first (`AGENTS.md`, its
`hotsheet:specifics` block, or the README's documentation index). If a document is absent,
create a minimal truthful one in the same change and link it from the index.

## Steps

1. **Read all requirements documents.** Enumerate them from disk (the docs directory the index
   names, numbered docs, design notes, the UI conventions document, the manual test plan),
   not from a list written here. Note every requirement, behavior, and constraint, with its
   status marker where one exists.

2. **Verify each requirement on every surface it touches.** A requirement often spans several
   surfaces: a field must round-trip through the file format, the CLI, the server API, and the
   client. For each surface, use the real artifact as evidence: `<cli> <subcommand> --help`
   against the CLI doc; the route table (`grep -n '\.route(' <server entry>`, or the
   framework's equivalent) against the API doc; the shipped parent composition, not a demo
   route, for client behavior. Where the project promises parity between surfaces (every
   client workflow also has a headless path), flag single-surface capabilities. Where it
   declares provider or adapter neutrality, check that the documented capability matrix
   matches what each implementation enforces.

3. **Check for undocumented features.** CLI subcommands, routes, settings keys, and client
   features with no requirements doc. Each is documented or questioned.

4. **Check for stale documentation.** Requirements describing behavior that no longer exists
   or changed, and status markers (shipped, partial, design-only, deferred) that no longer
   match reality.

5. **Verify `AGENTS.md`.** Its test setup, commands, gates, and conventions must match the
   real scripts (package manifests, workspace configuration, CI workflows). Flag any command
   that no longer exists and any enforced gate it does not mention. Edit only factual command
   and gate names; report everything else.

6. **Synchronize the codebase map.** Confirm, then edit in place: the directory tree against
   `ls`; entry points, subcommands, and routes; schema and file-format fields against the
   model source; settings keys against their reader; client modules; and the "where do I look
   for X" index, so every entry points at a file that exists.

7. **Synchronize the requirements summary.** Edit in place: every requirements doc has a row
   with a correct status marker; new docs are listed; renamed or superseded docs are updated;
   shipped-versus-design status reflects the code you just checked.

8. **Synchronize the feature coverage record.** Run the project's coverage-matrix check when
   it has one. Flag features whose documented coverage disagrees with the evidence (claims of
   double coverage whose test files no longer exist or no longer exercise the feature), flag
   shipped features missing a row, and fix the rows you can verify.

9. **Final consistency pass.** Make `AGENTS.md`, the codebase map, the requirements summary,
   and the coverage record agree with each other and with the source docs and code. Resolve
   every disagreement in favor of the code or the source requirement. The most common drift is
   a subcommand, route, or settings key added with only its own doc updated while the map and
   summary lag; look for that explicitly.

## Report format

### Discrepancies found

For each discrepancy:

- **Requirement**: doc, section, and the stated requirement
- **Surface**: every surface affected
- **Implementation**: what the code actually does (path and line numbers)
- **Type**: `missing` (doc says X, code does not do X) | `different` (doc says X, code does Y)
  | `undocumented` (code does X, no doc mentions it) | `stale` (doc says X, feature was
  removed or changed) | `parity` (a capability on one surface with no counterpart where parity
  is promised)
- **Recommendation**: update the doc, or fix the code?

### Synthesis document synchronization

For the codebase map, the requirements summary, the coverage record, and `AGENTS.md`: the
sections or rows edited and why, or "no changes needed".

### Questions

Ambiguous requirements where the implementation made a judgment call; ask whether the current
behavior is correct.

### Summary

Requirements checked and how many are fully implemented; discrepancies by type and surface;
files edited; Hot Sheet tickets filed for code fixes (list the slugs), one for every
discrepancy that needs a code change rather than a doc edit.

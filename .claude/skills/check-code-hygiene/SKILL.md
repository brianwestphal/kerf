---
name: check-code-hygiene
description: Check the project for standardization, readability, maintenance complexity, defensive coding, and shell-script hygiene, using its own conventions as the authority and mechanical recipes for the sweep, then report prioritized, ticketed findings.
allowed-tools: Read, Grep, Glob, Bash, Agent
---

<!-- ai-playbook:skill name=check-code-hygiene v=1 -->

> **Conventions live in the project, not here.** Before flagging anything against a rule, open
> `AGENTS.md`, the UI conventions document, and the engineering docs the codebase map points
> at, and read the current text. Treat any figure below as a pointer to the right section. The
> mechanical recipes (greps, `wc`, ast-grep patterns, dependency graphs) are the durable part.

Analyze the project for hygiene problems and report them. Cover every surface and say which one
each finding belongs to; enumerate surfaces from the workspace manifests and `ls`, not from
memory. Skip generated files, fixtures, vendored assets, and lockfiles.

## 1. Standardization

- **Naming.** Apply each language's convention: Rust `snake_case` items, `CamelCase` types,
  and `SCREAMING_SNAKE_CASE` constants; TypeScript camelCase values and PascalCase types; CSS
  blocks named for the owning component; filenames that say what they hold. Flag one concept
  with different names across surfaces, such as a field called one thing on the wire and
  another in the UI model, or a CLI flag and the matching HTTP field describing the same thing
  differently.
- **One concern per module.** A file holding unrelated responsibilities, or a component file
  exporting several unrelated components.
- **Error handling consistency.** CLI errors reach the user with an actionable message and a
  non-zero exit; server handlers map failures to the shared error type with stable status
  codes; client API failures surface through the established error component, not ad-hoc
  console logging. Flag operations of the same kind handled three different ways, and terse
  throws that give a symptom without a hint.
- **Imports.** Flag only what the linters cannot see: deep relative imports that bypass a
  module's public entry, and missing file extensions where the module system requires them.

## 2. Human readability

- **Function length.** Flag functions over about 50 lines that hide more than one step. Large
  dispatch tables, route tables, help text, and generated data are not findings.
- **Nesting depth.** More than three levels.
- **Magic numbers and strings.** Timeouts, limits, ports, retry counts, and event names that
  should be named constants, especially values duplicated between a server and a client.
- **Unclear naming.** Ambiguous abbreviations or single-letter names outside tight closures.
- **Comments.** They explain *why*. Flag a missing why on non-obvious logic and noise comments
  that restate the next line. Ticket-slug references in comments are the house style for
  decisions; flag ones pointing at tickets that are cancelled or deleted.
- **File length.** Rank with `wc -l` across the source trees, then judge each large file by
  concern count. A split proposal is a finding; length alone is not.

## 3. Maintenance complexity

- **Coupling.** Derive the dependency graph rather than matching a list: `cargo tree
  --workspace --depth 1` for Rust, or `grep -rhoE "from '\.\.?/[^']+'" <src> | sort | uniq -c
  | sort -rn` for TypeScript. Check it against the architecture document. Flag an edge that
  crosses layers for no stated reason (components importing the application runtime, a crate
  reaching into another's internals), not merely a high-degree node.
- **Shared mutable state.** Rust `static`, `OnceLock`, and `Mutex` globals; TypeScript
  module-level `let` and signals outside a store or controller (`grep -rnE '^(export )?let '
  <src>`). Each needs a stated reason. Module-level mutable state in code that promises
  re-entrancy is a finding even when the code is currently correct.
- **Async complexity.** Task chains without cancellation or ownership of the handle; promise
  chains that can resolve after their owner is disposed.
- **Branching.** `if`/`else` or `match` chains over about six arms that dispatch on a type or
  provider and would be clearer as a table or trait.
- **Duplicate patterns.** The same workflow implemented separately on two surfaces (CLI and
  server, two client components). Where the project promises parity, one shared workflow
  invoked by both is the standard; flag forks.
- **Injection seams.** Where the project is testable because of deliberate seams (an injected
  clock, environment, process, or client factory), flag new code that reaches for the real
  thing directly.

## 4. Defensive coding

- **Input validation at boundaries.** Handlers validate path, query, and body inputs (ids,
  slugs, sizes, enum strings) and reject unknown values explicitly; CLI arguments are validated
  before touching storage; client adapters parse responses instead of casting them; parsers of
  external JSON stay defensive about every field.
- **Panics on boundaries.** `unwrap`, `expect`, and indexing on user, file, network, or git
  input in non-test code.
- **Error boundaries.** Blanket catches, `let _ =`, and `.ok()` that swallow errors without a
  reason comment.
- **Null and type safety.** Non-null assertions in production code; `any`, `as unknown as`,
  and unchecked casts on parsed JSON; `Option` unwrapped where `?` or an explicit error
  belongs.
- **Injection and paths.** Commands built from strings instead of a typed program with
  arguments; path joins from request input without containment checks; Markdown or HTML
  rendered without the sanitizing pipeline.
- **Secrets and customer data.** Credentials, tokens, keychain values, or customer content in
  logs, settings files, ticket text, fixtures, telemetry, or error messages (see
  `customer-data-hygiene` when installed).
- **Resource cleanup.** Spawned processes, temp files, and listeners without a matching
  cleanup path.

## 5. Shell scripts

Shipped scripts get a lighter but real pass: `set -euo pipefail` present; `bash -n` parses and
`shellcheck` runs when available; quoted expansions, especially paths; `!` binding to one
command in compound conditions; `curl --fail` so an error page is an error rather than a file.

## Report format

For each finding:

- **Surface**: the surface from the table you derived
- **File**: path and line numbers
- **Category**: standardization | readability | maintenance | defensive | shell
- **Severity**: high | medium | low
- **Description**: what the issue is
- **Suggestion**: how to fix it

End with a prioritized summary of the most impactful improvements across all surfaces: at most
ten, and fewer when the codebase is healthy. Do not pad the list to look thorough. File a Hot
Sheet ticket for every non-trivial finding (a task for a cleanup, a bug for a real defect) and
list the slugs.

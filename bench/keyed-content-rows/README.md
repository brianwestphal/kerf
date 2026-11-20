# Keyed content-row ownership experiment

Retain `each` with `selector` as the default for declarative lists. In Chromium it preserved an editable input across an immutable refetch and used about half as much live JS heap as per-row mounts at 10,000 rows. For applications already using `bindList` to own a row's local reactive state, an explicit **content** callback is a useful additive candidate. It can eliminate the render probe and keep the row's inner mount on same-key item replacement. The existing element-returning mode remains useful for caller-owned DOM.

## API under consideration

The experiment lives entirely in this directory. A possible `kerfjs/list` API would use a discriminated options union:

```ts
type Content<T> = (item: T, sourceIndex: () => number) => MountResult;
type Authoring<T> =
  | { render: BindListOptions<T>['render']; content?: never }
  | { content: Content<T>; render?: never };
```

Existing calls keep their current ownership semantics. A consumer opting in might migrate from `bindList(root, rows, { key, tag: 'li', render: renderEditor })` to:

```tsx
// Proposed API. The experimental implementation is bindKeyedContent.
const dispose = bindList(root, rows, {
  tag: 'li',
  key: (item) => item.id,
  content: (item, sourceIndex) => (
    <label>
      {sourceIndex() + 1}. {item.label}
      <input aria-label={item.label} />
    </label>
  ),
});
```

Compare the declarative alternative: `<ul>{each(rows.value, item => <li data-key={item.id}>…</li>)}</ul>`. It works in server string rendering. The imperative alternative needs a browser parent and a disposer, the parent supplies the host tag, and a virtual window owns only visible row mounts. An index read is the absolute index in the source, including after scrolling a window. Use it only where position is displayed. Focus can survive a refetch of an in-window key; leaving the virtual window unmounts that row.

## How the fixture works

`keyed-content.ts` composes the public element-owner contract. Each key gets one host, one item cell and one nested mount. Reading the item and external state happens inside the row mount. The existing controller preflights duplicate keys and decides when an item reference or version changed. The adapter's update callback sends a fresh holder to the cell so a same-reference mutation still invalidates the row. A granular replacement that changes the key releases the old inner mount before creating the new content. Use immutable key values; mutating an identity field in place cannot recover its prior value from the mutated item.

The watched strategy allocates a position signal only on first access. Signals-core watched/unwatched hooks register the row while its position is observed. A source notification scans the source once if any position is observed and compares observed positions, publishing changes in a batch. The prototype validates that the full key-to-index map is unique before it publishes. When none are observed it skips the scan. The eager comparator creates and maintains one index cell per row. An integrated controller could reuse duplicate-key preflight's map and restrict position recalculation to the move/insert interval. That is a potential improvement and is excluded from these measurements.

## Chromium results

Fresh production bundles from the same pre-change runtime as `../authoring-defaults`. Each of the four strategies was exercised on a plain-array source and an `arraySignal`. Across a ten-row same-ID refetch:

| Strategy                                 | Initial content callbacks | Additional callbacks on refetch | Original host, input, focus and draft |
| ---------------------------------------- | ------------------------: | ------------------------------: | ------------------------------------- |
| each + selector                          |                        10 |                              10 | Preserved                             |
| bindList legacy content                  |                        20 |                              20 | Host and input replaced; focus lost   |
| Explicit content, watched/eager position |                        10 |                              10 | Preserved                             |

For the prototype, selecting a row caused zero content rerenders; changing one item rendered one row. An open index subscription moved from 0 to 2 when its row moved, stopped receiving work when it was conditionally unused, and resumed at the current position. Duplicate keys left the prior DOM unchanged. A throwing inserted row recovered on a valid snapshot and a throwing granular update recovered on the next corrected update. After removal, later selection writes left the detached row untouched. These checks cover reactive DOM behavior; an application that writes independent external side effects while rendering still owns those effects.

Medians from three fresh Chromium pages per cell, Apple M5 Pro, Chromium 153.0.8010.12. Each cell shows **synchronous creation ms / live JS heap delta MiB**. Each list has the same input, label and selection binding per row. Index readers add a visible number, so compare eager versus watched at the same reader count.

| Strategy / index readers |           10 |        1,000 |        10,000 |
| ------------------------ | -----------: | -----------: | ------------: |
| each / none              | 1.40 / −0.07 |  7.20 / 1.29 | 46.80 / 12.54 |
| legacy / none            | 1.40 / −0.03 |  8.00 / 2.57 | 48.70 / 24.71 |
| watched / none           | 1.50 / −0.02 |  7.70 / 2.71 | 45.60 / 25.95 |
| watched / one            | 1.50 / −0.02 |  7.80 / 2.73 | 46.40 / 26.17 |
| watched / all            | 1.50 / −0.01 | 10.50 / 2.92 | 75.00 / 28.08 |
| eager / none             | 1.40 / −0.02 |  8.00 / 2.84 | 46.80 / 27.37 |
| eager / all              | 1.60 / −0.02 | 10.50 / 2.92 | 74.90 / 28.08 |

At 10,000 rows with no index reads the watched path allocated zero position cells and performed zero position scans. Eager allocated 10,000 and performed one initial scan. Small heap deltas are below measurement noise; Chromium may release more initialization garbage than a ten-row view retains. The CDP numbers compare post-GC JS heaps within an engine and exclude native DOM memory. The raw file includes every sample, the one-index eager comparator, teardown heap deltas, and per-stage counters.

**Promotion decision:** keep the fixture as evidence for KF-E5JEN9. Keep the current public defaults. If an actual per-row editor needs both index tracking and stable refetch ownership, prefer the mutually exclusive content option over a second list framework. Integrate with bindList's existing key preflight, return its full handle, and preserve existing window/measurement options. Before shipping, verify packed types, failure recovery, full browser coverage and KF-ZMER8Y's guarantee for an inner global hole retargeted to a different signal instance. The prototype measures a single Chromium build and tests fixed-height virtualization; it does not establish cross-engine performance or measured-height compatibility.

## Reproduce

From a fresh checkout, run `npm ci`, `npm run build`, and `npx playwright install chromium`. Then:

```sh
node node_modules/typescript7/bin/tsc -p bench/keyed-content-rows/tsconfig.json
node bench/keyed-content-rows/run.mjs
```

The runner verifies the ownership scenarios and measures 72 cold pages at sizes 10/1,000/10,000. It stores new runs in `results.local.json`. Set `SMOKE=1` for the ten-row smoke pass. The checked-in reference run and experiment source are versioned together. [Raw measurements](./baseline-chromium.json)

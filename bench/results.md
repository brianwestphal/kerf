# kerfjs vs reference frameworks — krausest js-framework-benchmark

**Source of truth:** the official [krausest js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/current.html), measured on the maintainer's reference machine. kerf is a merged upstream entry (`frameworks/keyed/kerfjs`), so it is measured alongside every competitor on the same hardware in the same run — the numbers below are therefore directly comparable and independently reproducible.

Imported from krausest's published results via `node bench/import-krausest.mjs` on 2026-07-22. Re-run + commit to refresh.

Frameworks: kerfjs-v0.16.0-keyed, solid-v1.9.3-keyed, lit-v3.2.0-keyed, vue-v3.6.0-alpha.2-keyed, react-hooks-v19.2.0-keyed, vanjs-v1.5.2-keyed, preact-signals-v10.27.1 + 2.3.1-keyed, vanillajs-non-keyed

All numbers are medians of the per-iteration totals krausest published. Lower is better. Sorted by the first column.

### CPU benchmarks (ms)

| framework | create 1k | replace 1k | partial update | select row | swap rows | remove row | create 10k | append 1k | clear 1k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| vanillajs-non-keyed | 20.2 | 10.5 | 10.1 | 2.5 | 7.9 | 17.5 | 222.9 | 23.1 | 8.3 |
| solid-v1.9.3-keyed | 20.8 | 23.2 | 10.2 | 3.1 | 12.6 | 9.7 | 225.5 | 23.4 | 10.7 |
| lit-v3.2.0-keyed | 23.1 | 25.6 | 11.6 | 5.0 | 16.3 | 10.7 | 244.0 | 27.3 | 11.7 |
| react-hooks-v19.2.0-keyed | 23.6 | 29.1 | 13.6 | 4.8 | 84.9 | 10.9 | 424.3 | 28.1 | 16.3 |
| vue-v3.6.0-alpha.2-keyed | 23.8 | 26.3 | 12.2 | 3.4 | 13.0 | 11.7 | 253.3 | 27.0 | 11.5 |
| vanjs-v1.5.2-keyed | 25.9 | 27.8 | 22.6 | 7.7 | 11.2 | 11.6 | 280.0 | 32.4 | 9.1 |
| **kerfjs-v0.16.0-keyed** | 27.2 | 29.6 | 16.0 | 6.1 | 12.8 | 10.0 | 284.5 | 30.7 | 10.7 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 30.4 | 32.0 | 10.3 | 3.9 | 14.3 | 10.9 | 305.6 | 31.7 | 13.0 |

### Memory benchmarks

| framework | ready memory (MB) | run memory (MB) | cleared memory (MB) |
| --- | --- | --- | --- |
| solid-v1.9.3-keyed | 0.5 | 2.6 | 0.8 |
| vanjs-v1.5.2-keyed | 0.6 | 2.3 | 0.7 |
| vanillajs-non-keyed | 0.6 | 1.8 | 0.6 |
| lit-v3.2.0-keyed | 0.7 | 2.7 | 0.8 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 0.7 | 5.0 | 2.0 |
| **kerfjs-v0.16.0-keyed** | 0.8 | 2.4 | 1.1 |
| vue-v3.6.0-alpha.2-keyed | 0.8 | 3.7 | 1.1 |
| react-hooks-v19.2.0-keyed | 1.2 | 4.4 | 1.9 |

### Size + first-paint

| framework | gzipped bundle (KB) | uncompressed (KB) | first paint (ms) |
| --- | --- | --- | --- |
| vanjs-v1.5.2-keyed | 2.0 | 5.8 | 38.8 |
| vanillajs-non-keyed | 2.4 | 12.0 | 39.9 |
| solid-v1.9.3-keyed | 4.5 | 11.5 | 38.4 |
| lit-v3.2.0-keyed | 7.3 | 22.1 | 58.2 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 8.2 | 23.1 | 58.5 |
| **kerfjs-v0.16.0-keyed** | 12.5 | 39.6 | 87.4 |
| vue-v3.6.0-alpha.2-keyed | 22.8 | 63.7 | 90.8 |
| react-hooks-v19.2.0-keyed | 51.4 | 190.3 | 222.6 |

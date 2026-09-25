# kerfjs vs reference frameworks — krausest js-framework-benchmark

**Source of truth:** the official [krausest js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/current.html), measured on the maintainer's reference machine. kerf is a merged upstream entry (`frameworks/keyed/kerfjs`), so it is measured alongside every competitor on the same hardware in the same run — the numbers below are therefore directly comparable and independently reproducible.

Imported from krausest's published results via `node bench/import-krausest.mjs` on 2026-09-25. Re-run + commit to refresh.

Frameworks: kerfjs-v0.16.0-keyed, solid-v1.9.3-keyed, lit-v3.2.0-keyed, vue-v3.5.39-keyed, react-hooks-v19.2.0-keyed, vanjs-v1.5.2-keyed, preact-signals-v10.29.8 + 2.3.1-keyed, vanillajs-non-keyed

All numbers are medians of the per-iteration totals krausest published. Lower is better. Sorted by the first column.

### CPU benchmarks (ms)

| framework | create 1k | replace 1k | partial update | select row | swap rows | remove row | create 10k | append 1k | clear 1k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| vanillajs-non-keyed | 20.8 | 10.4 | 10.0 | 2.3 | 7.8 | 17.2 | 221.8 | 23.6 | 8.8 |
| solid-v1.9.3-keyed | 21.4 | 24.0 | 10.3 | 3.3 | 12.6 | 9.8 | 227.9 | 24.9 | 10.7 |
| react-hooks-v19.2.0-keyed | 23.7 | 30.0 | 14.0 | 5.5 | 89.9 | 11.1 | 388.9 | 29.2 | 17.8 |
| lit-v3.2.0-keyed | 23.8 | 26.2 | 11.8 | 5.2 | 15.8 | 11.0 | 249.7 | 28.4 | 13.1 |
| vue-v3.5.39-keyed | 24.5 | 27.1 | 12.7 | 3.7 | 13.4 | 12.2 | 264.0 | 27.6 | 12.6 |
| vanjs-v1.5.2-keyed | 26.5 | 28.9 | 26.6 | 6.7 | 11.4 | 13.5 | 283.3 | 30.2 | 11.6 |
| **kerfjs-v0.16.0-keyed** | 27.6 | 30.3 | 16.1 | 6.6 | 12.6 | 10.2 | 280.6 | 31.2 | 11.6 |
| preact-signals-v10.29.8 + 2.3.1-keyed | 29.3 | 31.6 | 10.6 | 4.3 | 13.9 | 10.8 | 304.5 | 32.3 | 13.9 |

### Memory benchmarks

| framework | ready memory (MB) | run memory (MB) | cleared memory (MB) |
| --- | --- | --- | --- |
| vanjs-v1.5.2-keyed | 0.6 | 2.3 | 0.6 |
| vanillajs-non-keyed | 0.6 | 1.8 | 0.6 |
| solid-v1.9.3-keyed | 0.6 | 2.7 | 0.8 |
| preact-signals-v10.29.8 + 2.3.1-keyed | 0.7 | 5.0 | 2.0 |
| lit-v3.2.0-keyed | 0.7 | 2.8 | 0.9 |
| **kerfjs-v0.16.0-keyed** | 0.7 | 2.5 | 1.1 |
| vue-v3.5.39-keyed | 0.9 | 3.9 | 1.2 |
| react-hooks-v19.2.0-keyed | 1.2 | 4.4 | 2.0 |

### Size + first-paint

| framework | gzipped bundle (KB) | uncompressed (KB) | first paint (ms) |
| --- | --- | --- | --- |
| vanjs-v1.5.2-keyed | 2.0 | 5.8 | 49.9 |
| vanillajs-non-keyed | 2.4 | 12.0 | 45.3 |
| solid-v1.9.3-keyed | 4.5 | 11.5 | 47.3 |
| lit-v3.2.0-keyed | 7.3 | 22.1 | 64.4 |
| preact-signals-v10.29.8 + 2.3.1-keyed | 8.2 | 23.1 | 55.1 |
| **kerfjs-v0.16.0-keyed** | 12.5 | 39.6 | 59.8 |
| vue-v3.5.39-keyed | 23.3 | 64.4 | 93.9 |
| react-hooks-v19.2.0-keyed | 51.4 | 190.3 | 221.4 |

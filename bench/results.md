# kerfjs vs reference frameworks — krausest js-framework-benchmark

Frameworks measured: kerfjs-v0.4.2-keyed, lit-v3.2.0-keyed, preact-signals-v10.27.1 + 2.3.1-keyed, react-hooks-v19.2.0-keyed, solid-v1.9.3-keyed, vanillajs-non-keyed, vanjs-v1.5.2-keyed, vue-v3.6.0-alpha.2-keyed

All numbers are medians across the iterations the benchmark ran (per `--count`). Lower is better. Sorted by the first column.

### CPU benchmarks (ms)

| framework | create 1k | replace 1k | partial update | select row | swap rows | remove row | create 10k | append 1k | clear 1k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| vanillajs-non-keyed | 30.8 | 16.5 | 22.2 | 4.8 | 14.8 | 30.8 | 348.1 | 37.3 | 15.8 |
| solid-v1.9.3-keyed | 33.1 | 36.4 | 20.1 | 6.3 | 22.1 | 17.2 | 362.0 | 38.3 | 18.3 |
| vue-v3.6.0-alpha.2-keyed | 37.5 | 41.3 | 21.5 | 6.5 | 22.1 | 20.8 | 408.6 | 43.6 | 19.8 |
| lit-v3.2.0-keyed | 38.3 | 41.5 | 21.7 | 9.5 | 26.9 | 20.3 | 397.3 | 43.9 | 21.1 |
| react-hooks-v19.2.0-keyed | 40.1 | 46.6 | 24.7 | 8.6 | 146.4 | 18.6 | 619.7 | 46.2 | 25.7 |
| vanjs-v1.5.2-keyed | 42.5 | 44.3 | 44.6 | 11.3 | 19.9 | 19.3 | 435.1 | 49.5 | 15.3 |
| **kerfjs-v0.4.2-keyed** | 43.1 | 46.2 | 46.8 | 27.8 | 23.3 | 17.2 | 442.3 | 47.0 | 18.9 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 53.4 | 52.8 | 20.6 | 8.1 | 25.3 | 19.0 | 485.3 | 49.5 | 22.9 |


### Memory benchmarks

| framework | ready memory (MB) | run memory (MB) | cleared memory (MB) |
| --- | --- | --- | --- |
| solid-v1.9.3-keyed | 0.5 | 2.6 | 0.7 |
| vanillajs-non-keyed | 0.5 | 1.7 | 0.6 |
| vanjs-v1.5.2-keyed | 0.5 | 2.3 | 0.6 |
| **kerfjs-v0.4.2-keyed** | 0.6 | 2.4 | 0.9 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 0.6 | 5.0 | 1.9 |
| lit-v3.2.0-keyed | 0.7 | 2.8 | 0.9 |
| vue-v3.6.0-alpha.2-keyed | 0.8 | 3.7 | 1.2 |
| react-hooks-v19.2.0-keyed | 1.1 | 4.3 | 1.9 |


### Size + first-paint

| framework | gzipped bundle (KB) | uncompressed (KB) | first paint (ms) |
| --- | --- | --- | --- |
| vanjs-v1.5.2-keyed | 2.0 | 5.8 | 136.8 |
| vanillajs-non-keyed | 2.4 | 12.0 | 136.8 |
| solid-v1.9.3-keyed | 4.5 | 11.5 | 159.4 |
| lit-v3.2.0-keyed | 7.3 | 22.1 | 150.8 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 8.2 | 23.1 | 133.9 |
| **kerfjs-v0.4.2-keyed** | 8.7 | 26.6 | 133.1 |
| vue-v3.6.0-alpha.2-keyed | 22.8 | 63.7 | 132.7 |
| react-hooks-v19.2.0-keyed | 51.4 | 190.3 | 291.4 |


[aggregate-results] wrote /Users/westphal/Documents/kerf/bench/results.json

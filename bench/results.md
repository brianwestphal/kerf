# kerfjs vs reference frameworks — krausest js-framework-benchmark

Frameworks measured: kerfjs-v0.6.0-keyed, lit-v3.2.0-keyed, preact-signals-v10.27.1 + 2.3.1-keyed, react-hooks-v19.2.0-keyed, solid-v1.9.3-keyed, vanillajs-non-keyed, vanjs-v1.5.2-keyed, vue-v3.6.0-alpha.2-keyed

All numbers are medians across the iterations the benchmark ran (per `--count`). Lower is better. Sorted by the first column.

### CPU benchmarks (ms)

| framework | create 1k | replace 1k | partial update | select row | swap rows | remove row | create 10k | append 1k | clear 1k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| vanillajs-non-keyed | 31.5 | 16.5 | 20.1 | 4.5 | 13.8 | 29.8 | 335.6 | 35.8 | 15.5 |
| solid-v1.9.3-keyed | 33.5 | 36.8 | 18.6 | 6.2 | 21.1 | 16.4 | 348.8 | 37.0 | 19.6 |
| vue-v3.6.0-alpha.2-keyed | 39.0 | 41.0 | 21.8 | 6.4 | 20.8 | 19.6 | 396.4 | 41.5 | 19.8 |
| react-hooks-v19.2.0-keyed | 39.5 | 46.3 | 23.9 | 7.8 | 141.0 | 18.1 | 581.5 | 44.5 | 24.9 |
| lit-v3.2.0-keyed | 39.7 | 41.8 | 21.3 | 10.7 | 25.3 | 18.1 | 384.4 | 42.4 | 20.1 |
| vanjs-v1.5.2-keyed | 42.3 | 44.3 | 43.0 | 10.9 | 18.8 | 18.8 | 420.0 | 47.3 | 15.9 |
| **kerfjs-v0.6.0-keyed** | 44.1 | 45.3 | 27.3 | 7.8 | 21.3 | 16.3 | 426.4 | 46.2 | 17.6 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 54.5 | 52.2 | 22.7 | 9.5 | 24.6 | 18.7 | 463.9 | 48.8 | 21.6 |


### Memory benchmarks

| framework | ready memory (MB) | run memory (MB) | cleared memory (MB) |
| --- | --- | --- | --- |
| solid-v1.9.3-keyed | 0.5 | 2.6 | 0.7 |
| vanillajs-non-keyed | 0.5 | 1.7 | 0.6 |
| vanjs-v1.5.2-keyed | 0.5 | 2.3 | 0.6 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 0.6 | 5.0 | 1.9 |
| **kerfjs-v0.6.0-keyed** | 0.7 | 2.4 | 1.0 |
| lit-v3.2.0-keyed | 0.7 | 2.8 | 0.9 |
| vue-v3.6.0-alpha.2-keyed | 0.8 | 3.7 | 1.2 |
| react-hooks-v19.2.0-keyed | 1.1 | 4.3 | 1.9 |


### Size + first-paint

| framework | gzipped bundle (KB) | uncompressed (KB) | first paint (ms) |
| --- | --- | --- | --- |
| vanjs-v1.5.2-keyed | 2.0 | 5.8 | 52.1 |
| vanillajs-non-keyed | 2.4 | 12.0 | 52.0 |
| solid-v1.9.3-keyed | 4.5 | 11.5 | 48.8 |
| lit-v3.2.0-keyed | 7.3 | 22.1 | 123.6 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 8.2 | 23.1 | 121.8 |
| **kerfjs-v0.6.0-keyed** | 11.5 | 36.5 | 111.1 |
| vue-v3.6.0-alpha.2-keyed | 22.8 | 63.7 | 124.0 |
| react-hooks-v19.2.0-keyed | 51.4 | 190.3 | 287.3 |


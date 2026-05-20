# kerfjs vs reference frameworks — krausest js-framework-benchmark

Frameworks measured: kerfjs-v0.6.0-keyed, lit-v3.2.0-keyed, preact-signals-v10.27.1 + 2.3.1-keyed, react-hooks-v19.2.0-keyed, solid-v1.9.3-keyed, vanillajs-non-keyed, vanjs-v1.5.2-keyed, vue-v3.6.0-alpha.2-keyed

All numbers are medians across the iterations the benchmark ran (per `--count`). Lower is better. Sorted by the first column.

### CPU benchmarks (ms)

| framework | create 1k | replace 1k | partial update | select row | swap rows | remove row | create 10k | append 1k | clear 1k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| vanillajs-non-keyed | 31.1 | 15.9 | 22.3 | 4.5 | 14.9 | 31.4 | 342.5 | 36.2 | 14.8 |
| solid-v1.9.3-keyed | 32.3 | 36.5 | 20.2 | 6.0 | 21.4 | 17.3 | 353.1 | 37.0 | 18.9 |
| lit-v3.2.0-keyed | 36.3 | 41.0 | 21.5 | 9.0 | 28.9 | 18.0 | 397.3 | 42.8 | 20.4 |
| vue-v3.6.0-alpha.2-keyed | 37.7 | 40.5 | 23.9 | 6.3 | 21.3 | 19.3 | 404.3 | 42.8 | 19.2 |
| react-hooks-v19.2.0-keyed | 38.9 | 47.0 | 24.2 | 7.7 | 147.4 | 18.1 | 588.9 | 43.6 | 25.1 |
| **kerfjs-v0.6.0-keyed** | 42.0 | 45.8 | 27.8 | 7.2 | 23.3 | 16.9 | 433.1 | 46.4 | 19.0 |
| vanjs-v1.5.2-keyed | 42.3 | 44.3 | 43.9 | 11.2 | 18.9 | 18.8 | 428.6 | 48.1 | 14.7 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 51.0 | 52.2 | 20.8 | 7.6 | 27.9 | 18.6 | 480.1 | 48.6 | 21.8 |


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
| vanjs-v1.5.2-keyed | 2.0 | 5.8 | 109.6 |
| vanillajs-non-keyed | 2.4 | 12.0 | 111.4 |
| solid-v1.9.3-keyed | 4.5 | 11.5 | 164.7 |
| lit-v3.2.0-keyed | 7.3 | 22.1 | 157.5 |
| preact-signals-v10.27.1 + 2.3.1-keyed | 8.2 | 23.1 | 159.4 |
| **kerfjs-v0.6.0-keyed** | 11.5 | 36.5 | 151.9 |
| vue-v3.6.0-alpha.2-keyed | 22.8 | 63.7 | 175.3 |
| react-hooks-v19.2.0-keyed | 51.4 | 190.3 | 348.2 |


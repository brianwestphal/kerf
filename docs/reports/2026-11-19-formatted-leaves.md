# Formatted reactive leaves

Keep the existing computed signal as the default for frequently changing scalar text and attributes. Create it once in the scope that owns its inputs. A scalar-only inline factory composed from the same machinery offered equivalent write throughput, incurred a new computed per leaf per coarse render and added a second spelling for the same operation.

```tsx
const label = computed(() => format(count.value, units.value));
mount(root, () => <span title={label}>{label}</span>);
// The no-build template uses the same label in both holes.
```

A plain formatted read inside render, such as `format(count.value, units.value)`, reevaluates with its mount. It has little setup and is reasonable when updates are rare. For an inline candidate the fixture uses `derived(() => format(...))` in render, where `derived` returns a scalar computed. No new marker, serializer or dependency is necessary. Benchmarking this implementation measures the cost of placing the derived signal in the render, not a hypothetical compiler.

## Results

Run `npm run bench:micro -- bench/micro/formatted-leaves.bench.ts`. Source baseline 87e7f801, before the global retarget fix, Vitest/happy-dom on macOS. One source per element, with class and text sharing the same projection. Durations in milliseconds. Update and setup-plus-dispose are Tinybench means; disposal alone is the median of 15 independently constructed owners. Sub-millisecond values are JS observations without layout or paint. Other work was running on this machine.

| Elements | Implementation | One write | Setup + dispose | Disposal |
| -------: | -------------- | --------: | --------------: | -------: |
|        1 | coarse         |    0.0125 |          0.0103 |   0.0019 |
|        1 | stable         |    0.0009 |          0.0149 |   0.0017 |
|        1 | inline         |    0.0009 |          0.0146 |   0.0014 |
|      100 | coarse         |    0.0436 |          0.4364 |   0.0049 |
|      100 | stable         |    0.0009 |          0.8150 |   0.0124 |
|      100 | inline         |    0.0009 |          0.7765 |   0.0110 |
|     1000 | coarse         |    0.2981 |          4.2965 |   0.0082 |
|     1000 | stable         |    0.0009 |          9.0089 |   0.1466 |
|     1000 | inline         |    0.0009 |          8.5587 |   0.1156 |

A single source write ran the coarse mount once and formatted N elements; either bound variant performed one format shared by two DOM effects, with no mount rerender. Cold construction allocates zero/N/N computed signals; a subsequent coarse rerender constructs zero/zero/N additional computeds respectively. These are instrumented object counts, not bytes of retained heap. Declining a public export adds zero shipped JS bytes.

## Ownership and observable behavior

- The fixture compares escaped SSR output for JSX and tagged HTML, checks for absence of markers, and exercises the mounted tagged template through updates and disposal. Outside a mount, reading a computed for serialization produces a snapshot.
- Two owners can share one computed. Switching conditional dependencies detaches the old source; a thrown formatter propagates, then a valid write recovers. Removing a bound row stops its DOM writes while the other owner stays live. Releasing the last owner stops reevaluation.
- Hoisting a computed only works if its _changing inputs are reactive_. An inline factory closing over an ordinary prop must be refreshed on a coarse render even when markup is identical. On the baseline a changed prefix still displayed `old6` instead of `new6`. The benchmark logs the observed result so it can also be run after KF-ZMER8Y. That ticket corrects global source retargeting; creating fresh closures still carries allocation cost.
- Format user content as data. Use supported scalar holes and the normal class/attribute writers in both syntaxes. A structural branch that produces child markup belongs to render. Keep user-created callbacks and their disposal lifetimes visible at the owner boundary.

The inline helper saves the name of the computed for one use, but duplicates projection setup when two holes need the same value unless the caller names it anyway. Teach the stable pattern first. Revisit a dedicated API if independent authoring trials show recurrent mistakes that a recipe and the leaf diagnostic cannot address.

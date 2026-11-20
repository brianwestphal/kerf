import { computed, each, mount, selector, signal } from 'kerfjs';
import { arraySignal } from 'kerfjs/array-signal';
import { bindList } from 'kerfjs/list';
import { bindKeyedContent } from './keyed-content.js';

type Mode = 'each' | 'legacy' | 'eager' | 'watched';
type IndexUse = 'none' | 'first' | 'all';
interface RecordItem {
  id: number;
  label: string;
}
const row = (id: number): RecordItem => ({ id, label: 'Record ' + id });
const init = (n: number) => Array.from({ length: n }, (_, i) => row(i + 1));
const host = document.querySelector('ul')!;
const selection = signal(-1);
function start(mode: Mode, size: number, use: IndexUse, granular: boolean) {
  const source = granular ? arraySignal(init(size)) : signal(init(size));
  const stats = {
    renders: 0,
    projections: 0,
    positionCells: 0,
    positionWrites: 0,
    scans: 0,
  };
  const isSelected = selector(selection);
  const renderContent = (item: RecordItem, index?: () => number) => {
    stats.renders++;
    if (item.label === 'THROW') throw new Error('intentional render failure');
    const selected = computed(() => {
      stats.projections++;
      return isSelected(item.id).value ? 'chosen' : '';
    });
    return (
      <label class={selected} data-id={item.id}>
        <span>{item.label}</span>
        <input aria-label={'Edit ' + item.id} />
        {index && (use === 'all' || (use === 'first' && item.id === 1)) ? (
          <small>{index()}</small>
        ) : (
          ''
        )}
      </label>
    );
  };
  const stop =
    mode === 'each'
      ? mount(host, () => (
          <>
            {each('replace' in source ? source : source.value, (item, i) => (
              <li data-key={item.id}>{renderContent(item, () => i)}</li>
            ))}
          </>
        ))
      : mode === 'legacy'
        ? bindList(host, source, {
            tag: 'li',
            key: (r) => r.id,
            render: (r) => renderContent(r),
          })
        : bindKeyedContent(host, source, {
            tag: 'li',
            key: (r) => r.id,
            content: renderContent,
            positionStrategy: mode,
            stats,
          });
  return {
    source,
    stats,
    stop() {
      stop();
      host.replaceChildren();
    },
  };
}
type Run = ReturnType<typeof start>;
let active: Run | undefined;
function query(id: number) {
  return host.querySelector<HTMLLabelElement>('[data-id="' + id + '"]')!;
}
function verify(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}
function snapshot() {
  return { ...active!.stats };
}
function characterize(mode: Mode, granular: boolean) {
  const size = 10;
  const indexed = mode === 'watched' || mode === 'eager';
  const api = start(mode, size, indexed ? 'all' : 'none', granular);
  active = api;
  const source = api.source;
  const series: Record<string, unknown> = { cold: snapshot() };
  const edit = query(3).querySelector('input')!;
  edit.focus();
  edit.value = 'unsaved';
  edit.setSelectionRange(1, 4);
  const firstHost = query(3).parentElement;
  const updateSnapshot = (data: RecordItem[]) => {
    if ('replace' in source) source.replace(data);
    else source.value = data;
  };
  try {
    if (indexed)
      verify(api.stats.renders === size, 'one render per created row');
    selection.value = 3;
    verify(query(3).className === 'chosen', 'selection');
    if (indexed)
      verify(api.stats.renders === size, 'selection remounted a row');
    series.select = snapshot();
    updateSnapshot(source.value.map((r) => ({ ...r })));
    series.refetch = {
      ...snapshot(),
      sameHost: query(3).parentElement === firstHost,
      sameInput: query(3).querySelector('input') === edit,
      focus: document.activeElement === edit,
      range: [edit.selectionStart, edit.selectionEnd],
    };
    if (indexed)
      verify(
        document.activeElement === edit &&
          edit.selectionStart === 1 &&
          edit.selectionEnd === 4 &&
          edit.value === 'unsaved',
        'lost editable input',
      );
    if ('update' in source)
      source.update(2, (r) => {
        r.label = 'versioned';
        return r;
      });
    else
      updateSnapshot(
        source.value.map((r, i) =>
          i === 2 ? { ...r, label: 'versioned' } : r,
        ),
      );
    verify(
      query(3).textContent?.includes('versioned'),
      'update: ' + mode + ' ' + granular + ' ' + query(3).outerHTML,
    );
    if (indexed)
      verify(
        api.stats.renders === size * 2 + 1,
        'update rerendered unaffected rows',
      );
    series.update = snapshot();
    if ('insert' in source) {
      source.insert(0, row(100));
      source.move(3, 0);
    } else {
      const copy = [row(100), ...source.value];
      const [moved] = copy.splice(3, 1);
      copy.unshift(moved);
      updateSnapshot(copy);
    }
    verify(host.firstElementChild === query(3).parentElement, 'move');
    if (indexed) {
      verify(
        [...host.querySelectorAll('small')].every(
          (el, i) => el.textContent === String(i),
        ),
        'live source index',
      );
      verify(
        document.activeElement === edit && edit.selectionEnd === 4,
        'focus through movement',
      );
    }
    series.move = snapshot();
    if (indexed) {
      const before = host.innerHTML;
      let duplicate = false;
      try {
        updateSnapshot([...source.value, row(3)]);
      } catch {
        duplicate = true;
      }
      verify(
        duplicate && before === host.innerHTML,
        'duplicate allowed or mutated DOM',
      );
      updateSnapshot(source.value.slice(0, -1));
      const invalid = { id: 101, label: 'THROW' };
      let threw = false;
      try {
        if ('insert' in source) source.insert(0, invalid);
        else updateSnapshot([invalid, ...source.value]);
      } catch {
        threw = true;
      }
      verify(threw, 'missing renderer throw');
      updateSnapshot(
        source.value.map((r) =>
          r.id === 101 ? { ...r, label: 'recovered' } : r,
        ),
      );
      verify(
        query(101).textContent?.includes('recovered'),
        'failed to recover insertion',
      );
      if ('update' in source) {
        const previousInput = query(101).querySelector('input');
        source.update(0, (r) => ({ ...r, id: 102 }));
        verify(
          !query(101) &&
            query(102).querySelector('input') !== previousInput &&
            query(102).querySelector('small')?.textContent === '0',
          'new logical key must reset content and index',
        );
        let failedUpdate = false;
        try {
          source.update(0, (r) => ({ ...r, label: 'THROW' }));
        } catch {
          failedUpdate = true;
        }
        verify(failedUpdate, 'expected row update failure');
        source.update(0, (r) => ({ ...r, label: 'recovered again' }));
        verify(
          query(102).textContent?.includes('recovered again'),
          'failed to recover update',
        );
      }
    }
    const removed = query(3);
    updateSnapshot(source.value.filter((r) => r.id !== 3));
    const released = removed.outerHTML;
    selection.value = -1;
    verify(
      removed.outerHTML === released,
      'detached row retained subscription',
    );
    series.remove = snapshot();
    return series;
  } finally {
    api.stop();
    selection.value = -1;
    active = undefined;
  }
}
async function verifyPositions() {
  const data = arraySignal(init(20));
  const show = signal(true);
  const stats = { positionCells: 0, positionWrites: 0, scans: 0 };
  const stop = bindKeyedContent(host, data, {
    key: (r) => r.id,
    tag: 'li',
    stats,
    content: (item, index) => (
      <label data-id={item.id}>
        {item.id === 1 && show.value ? index() : 'off'}
      </label>
    ),
  });
  try {
    verify(
      stats.positionCells === 1 && query(1).textContent === '0',
      'single watched index',
    );
    data.move(0, 2);
    verify(
      query(1).textContent === '2' && stats.positionWrites === 1,
      'publish changed slot',
    );
    show.value = false;
    const saved = { ...stats };
    data.move(2, 0);
    verify(
      stats.scans === saved.scans &&
        stats.positionWrites === saved.positionWrites,
      'unwatched index still consumes work',
    );
    show.value = true;
    verify(
      query(1).textContent === '0',
      'resubscription reads latest position',
    );
  } finally {
    stop();
  }
  const scroll = document.createElement('div');
  scroll.style.cssText = 'height:40px;overflow:auto';
  document.body.appendChild(scroll);
  const release = bindKeyedContent(scroll, data, {
    key: (r) => r.id,
    virtualize: { rowHeight: 20, overscan: 0 },
    content: (item, index) => <span data-id={item.id}>{index()}</span>,
  });
  try {
    scroll.scrollTop = 200;
    scroll.dispatchEvent(new Event('scroll'));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const visible = [...scroll.querySelectorAll<HTMLElement>('[data-id]')];
    verify(
      visible.length > 0 &&
        Number(visible[0].dataset.id) > 1 &&
        visible.every(
          (el) => Number(el.textContent) === Number(el.dataset.id) - 1,
        ),
      'virtual rows must use absolute source position',
    );
  } finally {
    release();
    scroll.remove();
  }
}
Object.assign(window, {
  characterize,
  verifyPositions,
  cold(mode: Mode, size: number, use: IndexUse) {
    const begin = performance.now();
    active = start(mode, size, use, false);
    return {
      ms: performance.now() - begin,
      ...snapshot(),
      rows: host.children.length,
    };
  },
  clear() {
    active?.stop();
    active = undefined;
  },
});

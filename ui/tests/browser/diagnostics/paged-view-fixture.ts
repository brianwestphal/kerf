// Manual KF-SAYTM1 diagnostics only. The preparation script swaps only the
// test import in an ephemeral checkout; canonical gestures/assertions stay intact.
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { loadavg } from 'node:os';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  expect,
  type Locator,
  type Page,
  test as base,
} from '@playwright/test';

export { expect, type Locator, type Page };

export const test = base.extend({
  page: async ({ page, browser }, use, info) => {
    if (!info.title.includes('a hard fling stops on each page')) {
      await use(page);
      return;
    }
    const commands: unknown[] = [];
    const loadBefore = loadavg();
    let sessions = 0;
    let captured = false;
    let captureError: string | undefined;
    const capture = async (label: string) => {
      try {
        const path = info.outputPath(`paged-view-${label}.png`);
        await page.screenshot({ path });
        await info.attach(label, { path, contentType: 'image/png' });
        captured = true;
      } catch (error) {
        captureError = String(error);
      }
    };
    const context = page.context();
    const original = context.newCDPSession.bind(context);
    context.newCDPSession = async (target) => {
      // The second session starts only after the first fling's native snap,
      // geometry/report assertions and quiet period. Capture that settled state
      // before injecting the second gesture; never interrupt the first fling.
      if (sessions === 1) await capture('first-fling-settled');
      sessions += 1;
      const session = await original(target);
      session.send = new Proxy(session.send, {
        apply(send, receiver, args: unknown[]) {
          if (args[0] !== 'Input.dispatchTouchEvent')
            return Reflect.apply(send, receiver, args);
          const event = { command: args[1], sentAt: performance.now() };
          commands.push(event);
          const result = Reflect.apply(
            send,
            receiver,
            args,
          ) as Promise<unknown>;
          return result.then(
            (value) => {
              Object.assign(event, { acknowledgedAt: performance.now() });
              return value;
            },
            (error: unknown) => {
              Object.assign(event, {
                rejectedAt: performance.now(),
                error: String(error),
              });
              throw error;
            },
          );
        },
      });
      return session;
    };
    const session = await original(page);
    const version = await session.send('Browser.getVersion');
    await session.detach();
    const require = createRequire(import.meta.url);
    const manifest: unknown = JSON.parse(
      readFileSync(
        join(
          dirname(require.resolve('playwright-core/package.json')),
          'browsers.json',
        ),
        'utf8',
      ),
    );
    const playwright = require('playwright-core/package.json') as unknown;
    await page.addInitScript(() => {
      const events: unknown[] = [];
      let dropped = 0;
      let frames = 0;
      let frameCost = 0;
      let maxFrameCost = 0;
      let stopped = false;
      const started = performance.now();
      const record = (value: object) => {
        if (events.length < 12000)
          events.push({ at: performance.now(), ...value });
        else dropped += 1;
      };
      const hosts = new Set<HTMLElement>();
      const resize = new ResizeObserver((entries) => {
        for (const entry of entries)
          record({
            kind: 'viewport-resize',
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
      });
      const observe = () => {
        for (const root of document.querySelectorAll<HTMLElement>(
          '[data-component="paged-view"]',
        )) {
          if (
            root
              .querySelector('[role="tablist"]')
              ?.getAttribute('aria-label') !== 'Activity Pages' ||
            hosts.has(root)
          )
            continue;
          const viewport = root.querySelector<HTMLElement>(
            '.kui-paged-view__viewport',
          );
          if (!viewport) continue;
          hosts.add(root);
          resize.observe(viewport);
          record({
            kind: 'attach',
            snapType: window.getComputedStyle(viewport).scrollSnapType,
            pages: Array.from(viewport.children).map((child) => ({
              id: (child as HTMLElement).dataset.pagedViewPage,
              snapStop: window.getComputedStyle(child).scrollSnapStop,
            })),
          });
          new MutationObserver(() => {
            record({ kind: 'app-report', page: root.dataset.page });
          }).observe(root, {
            attributes: true,
            attributeFilter: ['data-page'],
          });
          for (const kind of [
            'touchstart',
            'touchmove',
            'touchend',
            'touchcancel',
            'scroll',
            'scrollend',
            'scrollsnapchange',
            'scrollsnapchanging',
          ])
            viewport.addEventListener(
              kind,
              (event) => {
                const touch = event as TouchEvent;
                const snap = event as Event & {
                  snapTargetInline?: HTMLElement | null;
                };
                record({
                  kind,
                  timestamp: event.timeStamp,
                  offset: viewport.scrollLeft,
                  page: root.dataset.page,
                  snap: snap.snapTargetInline?.dataset.pagedViewPage,
                  touches: touch.changedTouches
                    ? Array.from(touch.changedTouches).map((point) => ({
                        id: point.identifier,
                        x: point.clientX,
                        y: point.clientY,
                      }))
                    : undefined,
                });
              },
              { passive: true },
            );
        }
      };
      const mutations = new MutationObserver(observe);
      mutations.observe(document, { childList: true, subtree: true });
      const frame = () => {
        if (stopped || performance.now() - started > 30000) return;
        const before = performance.now();
        for (const root of hosts) {
          const viewport = root.querySelector<HTMLElement>(
            '.kui-paged-view__viewport',
          );
          if (viewport)
            record({
              kind: 'frame',
              offset: viewport.scrollLeft,
              width: viewport.clientWidth,
              page: root.dataset.page,
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
              },
            });
        }
        frames += 1;
        const cost = performance.now() - before;
        frameCost += cost;
        maxFrameCost = Math.max(maxFrameCost, cost);
        window.requestAnimationFrame(frame);
      };
      window.requestAnimationFrame(frame);
      Object.assign(window, {
        kfPagedDiagnostic: () => {
          stopped = true;
          resize.disconnect();
          mutations.disconnect();
          return {
            events,
            dropped,
            frames,
            frameCost,
            maxFrameCost,
            timeOrigin: performance.timeOrigin,
            userAgent: window.navigator.userAgent,
          };
        },
      });
    });
    try {
      await use(page);
    } finally {
      context.newCDPSession = original;
      if (!captured && !page.isClosed()) await capture('last-observed-state');
      let recording: unknown;
      try {
        recording = await page.evaluate(() =>
          (
            window as unknown as {
              kfPagedDiagnostic?: () => unknown;
            }
          ).kfPagedDiagnostic?.(),
        );
      } catch (error) {
        recording = { unavailable: String(error) };
      }
      const path = info.outputPath('paged-view-diagnostic.json');
      await writeFile(
        path,
        JSON.stringify(
          {
            title: info.title,
            status: info.status,
            workerIndex: info.workerIndex,
            parallelIndex: info.parallelIndex,
            retry: info.retry,
            browserVersion: browser.version(),
            nodeTimeOrigin: performance.timeOrigin,
            loadBefore,
            loadAfter: loadavg(),
            version,
            manifest,
            playwright,
            commands,
            captureError,
            recording,
          },
          null,
          2,
        ),
      );
      await info.attach('PagedView full-load diagnostic', {
        path,
        contentType: 'application/json',
      });
    }
  },
});

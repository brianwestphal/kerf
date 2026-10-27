// @vitest-environment node
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearInterval, setInterval } from 'node:timers';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  recoverSketchJob,
  runSketchJob,
} from '../../scripts/sketch/runner.mjs';

let root: string;
let task: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kerf-sketch-test-'));
  task = join(root, 'task.js');
  await writeFile(
    task,
    'module.exports.run = function(session, params, done) { done(); };',
  );
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function jobFrom(args: string[]) {
  const context = JSON.parse(args.at(-1)!);
  return JSON.parse(await readFile(context.jobFile, 'utf8'));
}
async function status(
  job: { jobDirectory: string; runId: string },
  extra = {},
) {
  const path = join(job.jobDirectory, 'status.json');
  await writeFile(
    path + '.tmp',
    JSON.stringify({
      runId: job.runId,
      state: 'succeeded',
      cleanupComplete: true,
      ...extra,
    }),
  );
  await rename(path + '.tmp', path);
}
const options = () => ({
  task,
  stateDirectory: root,
  timeoutMs: 1000,
  cleanupTimeoutMs: 100,
  pollMs: 1,
});

describe('Sketch runner lifecycle', () => {
  it('reuses Sketch and serializes jobs through native cleanup acknowledgement', async () => {
    let started!: (job: Awaited<ReturnType<typeof jobFrom>>) => void;
    const launch = new Promise<Awaited<ReturnType<typeof jobFrom>>>(
      (resolve) => {
        started = resolve;
      },
    );
    const first = runSketchJob({
      ...options(),
      invoke: async (_tool, args) => {
        expect(args).not.toContain('--new-instance');
        expect(args).toContain('--without-waiting-for-plugin');
        started(await jobFrom(args));
      },
    });
    const job = await Promise.race([launch, first]);
    await expect(
      recoverSketchJob({ stateDirectory: root, invoke: async () => {} }),
    ).rejects.toThrow('reserved');
    await expect(
      runSketchJob({
        ...options(),
        invoke: async () => {
          throw new Error('Must not dispatch');
        },
      }),
    ).rejects.toThrow('reserved');
    await status(job, { result: { ready: true } });
    expect((await first).result).toEqual({ ready: true });
    const next = await runSketchJob({
      ...options(),
      invoke: async (_tool, args) => {
        await status(await jobFrom(args));
      },
    });
    expect(next.state).toBe('succeeded');
  });

  it('releases only after failure cleanup, allowing a following run', async () => {
    await expect(
      runSketchJob({
        ...options(),
        invoke: async (_tool, args) => {
          await status(await jobFrom(args), {
            state: 'failed',
            error: 'Intentional failure',
          });
        },
      }),
    ).rejects.toThrow('Intentional failure');
    await expect(
      readFile(join(root, 'active', 'owner.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  for (const reason of ['abort', 'deadline']) {
    it(`waits for ownership cleanup after ${reason}`, async () => {
      const controller = new AbortController();
      let timer: ReturnType<typeof setInterval> | undefined;
      try {
        await expect(
          runSketchJob({
            ...options(),
            timeoutMs: 30,
            cleanupTimeoutMs: 1000,
            signal: controller.signal,
            invoke: async (_tool, args) => {
              const job = await jobFrom(args);
              if (reason === 'abort')
                controller.abort(new Error('User cancelled'));
              timer = setInterval(async () => {
                try {
                  await readFile(join(job.jobDirectory, 'cancel.json'));
                  clearInterval(timer);
                  await status(job, { state: 'cancelled' });
                } catch {
                  /* Wait for the host's cancellation request. */
                }
              }, 2);
            },
          }),
        ).rejects.toThrow(reason === 'abort' ? 'User cancelled' : 'timed out');
        await expect(
          readFile(join(root, 'active', 'owner.json')),
        ).rejects.toMatchObject({ code: 'ENOENT' });
      } finally {
        clearInterval(timer);
      }
    });
  }

  it('quarantines an unresponsive run and reclaims it only after cleanup arrives', async () => {
    let job: Awaited<ReturnType<typeof jobFrom>>;
    await expect(
      runSketchJob({
        ...options(),
        timeoutMs: 10,
        cleanupTimeoutMs: 10,
        invoke: async (_tool, args) => {
          job = await jobFrom(args);
        },
      }),
    ).rejects.toThrow('protective lock remains');
    await expect(
      runSketchJob({ ...options(), invoke: async () => {} }),
    ).rejects.toThrow('reserved');
    expect(
      (await recoverSketchJob({ stateDirectory: root, invoke: async () => {} }))
        .state,
    ).toBe('recovery-requested');
    await status(job!);
    expect((await recoverSketchJob({ stateDirectory: root })).state).toBe(
      'recovered',
    );
    expect((await recoverSketchJob({ stateDirectory: root })).state).toBe(
      'idle',
    );
  });

  it('preserves a lock when cleanup reports errors', async () => {
    await expect(
      runSketchJob({
        ...options(),
        invoke: async (_tool, args) => {
          await status(await jobFrom(args), {
            state: 'failed',
            cleanupComplete: false,
            cleanupErrors: ['Cannot close owned document'],
          });
        },
      }),
    ).rejects.toThrow('Cannot close');
    expect(
      JSON.parse(await readFile(join(root, 'active', 'owner.json'), 'utf8'))
        .runId,
    ).toBeTruthy();
  });

  it('quarantines an ambiguous launch timeout and explains safe recovery', async () => {
    await expect(
      runSketchJob({
        ...options(),
        invoke: async () => {
          throw Object.assign(new Error('Command failed'), { killed: true });
        },
      }),
    ).rejects.toThrow('Check the existing Sketch instance for a modal dialog');
    const owner = JSON.parse(
      await readFile(join(root, 'active', 'owner.json'), 'utf8'),
    );
    expect(
      JSON.parse(
        await readFile(join(owner.jobDirectory, 'cancel.json'), 'utf8'),
      ).runId,
    ).toBe(owner.runId);
    await expect(
      runSketchJob({ ...options(), invoke: async () => {} }),
    ).rejects.toThrow('reserved');
  });

  it('releases a missing-tool launch and never dispatches a pre-cancelled job', async () => {
    await expect(
      runSketchJob({
        ...options(),
        invoke: async () => {
          throw Object.assign(new Error('No Sketch tool'), { code: 'ENOENT' });
        },
      }),
    ).rejects.toThrow('No Sketch tool');
    await expect(
      readFile(join(root, 'active', 'owner.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    const controller = new AbortController();
    controller.abort(new Error('Already cancelled'));
    await expect(
      runSketchJob({
        ...options(),
        signal: controller.signal,
        invoke: async () => {
          throw new Error('Must not dispatch');
        },
      }),
    ).rejects.toThrow('Already cancelled');
  });
});

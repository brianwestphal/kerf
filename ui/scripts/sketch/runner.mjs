import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { lockSketchRunner } from './lock.mjs';

const execute = promisify(execFile);
export const defaultStateDirectory = join(tmpdir(), 'kerf-sketch-runner');
const plugin = fileURLToPath(new URL('./runner.sketchplugin', import.meta.url));
const defaultTool = '/Applications/Sketch.app/Contents/MacOS/sketchtool';

async function json(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function put(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value));
  await rename(temporary, path);
}

async function acquire(stateDirectory, owner) {
  const lock = join(stateDirectory, 'active');
  await mkdir(stateDirectory, { recursive: true });
  const unlock = await lockSketchRunner(join(stateDirectory, 'host.lock'));
  try {
    try {
      await mkdir(lock);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const previous = await json(join(lock, 'owner.json'));
      const status =
        previous && (await json(join(previous.jobDirectory, 'status.json')));
      if (
        !previous ||
        status?.runId !== previous.runId ||
        !status.cleanupComplete
      )
        throw new Error(
          `Sketch is reserved by another run. ${previous?.jobDirectory ?? lock}. Wait for cleanup; do not launch another app instance.`,
          { cause: error },
        );
      await rm(lock, { recursive: true });
      await mkdir(lock);
    }
    await put(join(lock, 'owner.json'), owner);
    return async (acknowledged) => {
      try {
        const current = await json(join(lock, 'owner.json'));
        if (acknowledged && current?.runId === owner.runId)
          await rm(lock, { recursive: true });
      } finally {
        await unlock();
      }
    };
  } catch (error) {
    await unlock();
    throw error;
  }
}

/** Serial native jobs; task modules export run(session, parameters, done). */
export async function runSketchJob({
  task,
  parameters = {},
  stateDirectory = defaultStateDirectory,
  timeoutMs = 120_000,
  cleanupTimeoutMs = 10_000,
  pollMs = 100,
  signal,
  tool = defaultTool,
  invoke = execute,
}) {
  if (!task || !Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error('A task and positive timeout are required.');
  await access(task);
  if (signal?.aborted)
    throw signal.reason ?? new Error('Sketch job cancelled.');
  const runId = randomUUID();
  const jobDirectory = join(resolve(stateDirectory), 'jobs', runId);
  const release = await acquire(resolve(stateDirectory), {
    runId,
    pid: process.pid,
    jobDirectory,
  });
  let acknowledged = false;
  let launched = false;
  let reason;
  try {
    await mkdir(jobDirectory, { recursive: true });
    const job = {
      runId,
      jobDirectory,
      task: resolve(task),
      parameters,
      deadline: Date.now() + timeoutMs,
    };
    const jobFile = join(jobDirectory, 'job.json');
    await put(jobFile, job);
    // Explicitly use the default app process. A slow run is never retried with
    // --new-instance; the lock spans launch, async work, and cleanup.
    launched = true;
    try {
      await invoke(
        tool,
        [
          'run',
          plugin,
          'run',
          '--without-activating',
          '--without-waiting-for-plugin',
          '--context',
          JSON.stringify({ jobFile }),
        ],
        { timeout: Math.min(timeoutMs, 30_000), maxBuffer: 1024 * 1024 },
      );
    } catch (error) {
      if (error.code === 'ENOENT') launched = false;
      throw error;
    }
    let cancelDeadline;
    while (true) {
      const status = await json(join(jobDirectory, 'status.json'));
      if (status?.runId === runId && status.cleanupErrors?.length)
        throw new Error(
          `Sketch cleanup failed: ${status.cleanupErrors.join('; ')}. The protective lock remains.`,
        );
      if (status?.runId === runId && status.cleanupComplete) {
        acknowledged = true;
        if (reason) throw reason;
        if (status.state !== 'succeeded')
          throw new Error(status.error ?? `Sketch job ${status.state}.`);
        return { ...status, jobDirectory };
      }
      if (!reason && (signal?.aborted || Date.now() >= job.deadline)) {
        reason = signal?.aborted
          ? (signal.reason ?? new Error('Sketch job cancelled.'))
          : new Error('Sketch job timed out.');
        await put(join(jobDirectory, 'cancel.json'), {
          runId,
          reason: String(reason),
        });
        cancelDeadline = Date.now() + cleanupTimeoutMs;
      }
      if (reason && Date.now() >= cancelDeadline)
        throw new Error(
          `${reason.message ?? reason} Cleanup was not acknowledged; the protective lock remains at ${stateDirectory}/active. Recover this run before starting another.`,
          { cause: reason },
        );
      await delay(pollMs);
    }
  } catch (error) {
    // Even a launch timeout can mean Sketch accepted an Apple event. Keep the
    // lock until native cleanup acknowledges it, rather than risk overlap.
    if (launched && !acknowledged)
      await put(join(jobDirectory, 'cancel.json'), {
        runId,
        reason: String(error),
      });
    throw error;
  } finally {
    await release(!launched || acknowledged);
  }
}

/** Request recovery without deleting a live/quarantined lock or killing Sketch. */
export async function recoverSketchJob({
  stateDirectory = defaultStateDirectory,
  tool = defaultTool,
  invoke = execute,
} = {}) {
  await mkdir(stateDirectory, { recursive: true });
  const unlock = await lockSketchRunner(join(stateDirectory, 'host.lock'));
  try {
    const owner = await json(join(stateDirectory, 'active', 'owner.json'));
    if (!owner) return { state: 'idle' };
    const status = await json(join(owner.jobDirectory, 'status.json'));
    if (status?.runId === owner.runId && status.cleanupComplete) {
      await rm(join(stateDirectory, 'active'), { recursive: true });
      return { state: 'recovered', jobDirectory: owner.jobDirectory };
    }
    await put(join(owner.jobDirectory, 'cancel.json'), {
      runId: owner.runId,
      reason: 'Recovery requested.',
    });
    await invoke(
      tool,
      [
        'run',
        plugin,
        'recover',
        '--without-activating',
        '--without-waiting-for-plugin',
        '--context',
        JSON.stringify({ jobFile: join(owner.jobDirectory, 'job.json') }),
      ],
      { timeout: 30_000 },
    );
    return { state: 'recovery-requested', jobDirectory: owner.jobDirectory };
  } finally {
    await unlock();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [command, task] = process.argv.slice(2);
  const controller = new AbortController();
  const cancel = () =>
    controller.abort(new Error('Sketch job cancelled by signal.'));
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    const result =
      command === 'recover'
        ? await recoverSketchJob()
        : command === 'run'
          ? await runSketchJob({ task, signal: controller.signal })
          : (() => {
              throw new Error('Usage: runner.mjs run <task.js> | recover');
            })();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

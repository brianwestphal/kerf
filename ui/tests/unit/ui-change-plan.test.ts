import { readFileSync } from 'node:fs';
import { delimiter, dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  commandEnvironment,
  DEMO_BUNDLE_COMMAND,
  DEMO_CHECK_COMMAND,
  uiChangeGateSteps,
  uiChangeSyncSteps,
} from '../../scripts/lib/ui-change-plan.mjs';

const uiRoot = resolve(import.meta.dirname, '../..');
const packageJson = JSON.parse(
  readFileSync(resolve(uiRoot, 'package.json'), 'utf8'),
) as { scripts: Record<string, string> };

describe('check:change demo-bundle measurement', () => {
  it('measures the demo with exactly the command sequence demo:build runs', () => {
    const gates = uiChangeGateSteps();
    const demoSteps = gates.slice(-2).map((step) => step.command);
    expect(demoSteps).toEqual([DEMO_BUNDLE_COMMAND, DEMO_CHECK_COMMAND]);
    expect(packageJson.scripts['demo:build']).toBe(demoSteps.join(' && '));
    expect(packageJson.scripts['demo:bundle']).toBe(
      'npm run build && vite build --config ux-demo/vite.config.ts',
    );
  });

  it('never builds the demo outside the shared demo:bundle script', () => {
    const commands = [...uiChangeSyncSteps(), ...uiChangeGateSteps()].map(
      (step) => step.command,
    );
    expect(commands.filter((command) => /\bvite\b/.test(command))).toEqual([]);
    expect(
      commands.filter((command) => command === DEMO_BUNDLE_COMMAND),
    ).toEqual([DEMO_BUNDLE_COMMAND]);
  });

  it('records a reviewed budget update through the same measurement', () => {
    const [bundle, update] = uiChangeGateSteps({
      updateBundleBudget: true,
      reason: 'reviewed growth',
    }).slice(-2);
    expect(bundle.command).toBe(DEMO_BUNDLE_COMMAND);
    expect(update).toEqual({
      label: 'record reviewed bundle budget update',
      command: `${DEMO_CHECK_COMMAND} --update-budget`,
      env: { KERF_UI_BUNDLE_REASON: 'reviewed growth' },
    });
  });

  it('pins child node/npm to the invoking Node binary', () => {
    const env = commandEnvironment(
      {
        PATH: ['/opt/homebrew/bin', '/usr/bin'].join(delimiter),
        HOME: '/home/me',
      },
      {
        execPath: '/nvm/v22/bin/node',
        root: '/repo/ui',
        extra: { KERF_UI_BUNDLE_REASON: 'why' },
      },
    );
    expect(env.PATH?.split(delimiter)).toEqual([
      dirname('/nvm/v22/bin/node'),
      resolve('/repo/ui', 'node_modules/.bin'),
      '/opt/homebrew/bin',
      '/usr/bin',
    ]);
    expect(env.HOME).toBe('/home/me');
    expect(env.KERF_UI_BUNDLE_REASON).toBe('why');
    expect(
      commandEnvironment({}, { execPath: '/n/bin/node', root: '/r' }).PATH,
    ).toBe(['/n/bin', resolve('/r', 'node_modules/.bin')].join(delimiter));
  });

  it('runs steps in a non-interactive shell that cannot swap the Node binary', () => {
    const script = readFileSync(
      resolve(uiRoot, 'scripts/check-ui-change.mjs'),
      'utf8',
    );
    expect(script).not.toMatch(/['"]-i?c['"]/);
    expect(script).toContain('commandEnvironment(process.env');
  });
});

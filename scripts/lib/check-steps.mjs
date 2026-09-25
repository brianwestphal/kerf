// Per-step timing for the root check chain. The chain stays a plain `&&`
// string in package.json (its single source of truth); the runner splits it,
// runs each segment in order with the same stop-on-first-failure semantics,
// and reports a low-cardinality identifier plus a duration per step. Only
// identifiers and milliseconds ever leave this module: never output or paths.

const IDENTIFIER = /^[a-z0-9][a-z0-9:._-]{0,79}$/;

/** Split an `a && b && c` npm script into its segments. */
export function splitCheckChain(script) {
  if (typeof script !== 'string' || script.trim() === '')
    throw new Error('The check chain script is empty');
  if (/\|\||;|(^|[^&])&([^&]|$)|\|/.test(script))
    throw new Error(
      'The check chain may only join commands with `&&`; split it differently or time it as one gate',
    );
  return script
    .split('&&')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function sanitize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9:._-]+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

function baseName(path) {
  return path.split('/').filter(Boolean).at(-1) ?? path;
}

function stepName(segment) {
  const words = segment.split(/\s+/);
  const [first, second, third] = words;
  if (first === 'npm' && second === 'test') return 'test';
  if (first === 'npm' && second === 'run' && third) {
    const script = words.slice(2).find((word) => !word.startsWith('-'));
    if (script) return script;
  }
  const configIndex = words.indexOf('--config');
  if (first === 'vitest' && configIndex !== -1 && words[configIndex + 1])
    return `vitest:${words[configIndex + 1].replace(/^vitest\.config\.?|\.[cm]?[jt]s$/g, '') || 'default'}`;
  if (first === 'vitest') return 'vitest';
  const projectIndex = words.indexOf('-p');
  if (/(^|\/)tsc$/.test(second ?? first) && words[projectIndex + 1]) {
    const project = words[projectIndex + 1].split('/').filter(Boolean);
    return `tsc:${project.length > 1 ? project.at(-2) : project[0]}`;
  }
  if (first === 'node' && second && !second.startsWith('-'))
    return baseName(second).replace(/\.[cm]?[jt]s$/, '');
  return baseName(first);
}

/** One unique, safe identifier per segment, in chain order. */
export function stepIdentifiers(segments) {
  const used = new Map();
  return segments.map((segment, index) => {
    const name = sanitize(stepName(segment)) || `step-${index + 1}`;
    const count = (used.get(name) ?? 0) + 1;
    used.set(name, count);
    const unique = count === 1 ? name : `${name}-${count}`;
    return IDENTIFIER.test(unique) ? unique : `step-${index + 1}`;
  });
}

/**
 * Timing-record fields for a (possibly partial) step log: an ordered
 * `steps` map of identifier → milliseconds plus the step that failed, if any.
 * Malformed entries are dropped rather than trusted.
 */
export function stepTimingFields(log) {
  const entries = Array.isArray(log?.steps) ? log.steps : [];
  const steps = {};
  let failedStep;
  for (const entry of entries) {
    if (!IDENTIFIER.test(entry?.name ?? '')) continue;
    if (!Number.isFinite(entry.duration_ms) || entry.duration_ms < 0) continue;
    steps[entry.name] = Math.round(entry.duration_ms);
    if (entry.outcome !== 'passed' && failedStep === undefined)
      failedStep = entry.name;
  }
  if (Object.keys(steps).length === 0) return {};
  return { steps, ...(failedStep ? { failed_step: failedStep } : {}) };
}

import { scoreAiRegression } from './ai-regression-score.mjs';

const recompute = (checks) => ({
  reuse: checks
    .filter((check) =>
      /^(?:import|component|avoid|duplicate):/.test(check.code),
    )
    .every((check) => check.pass),
  wiring: checks
    .filter((check) => check.code.startsWith('wiring:'))
    .every((check) => check.pass),
  layout: checks
    .filter((check) => /^(?:class|layout|css):/.test(check.code))
    .every((check) => check.pass),
  accessibility: checks
    .filter((check) => check.code.startsWith('a11y:'))
    .every((check) => check.pass),
  escalation: checks
    .filter((check) => check.code.startsWith('follow-up:'))
    .every((check) => check.pass),
});

/** Score suite-v2 wiring as equivalent public alternatives without changing the frozen v1 oracle. */
export function scoreAiRegressionV2(
  caseDefinition,
  response,
  catalog,
  options = {},
) {
  const { requiredWiringAny = [], ...baseDefinition } = caseDefinition;
  const base = scoreAiRegression(
    { ...baseDefinition, requiredWiring: [] },
    response,
    catalog,
    options,
  );
  const wiringChecks = requiredWiringAny.map((requirement) => {
    const attempts = requirement.options.map((option) => {
      const result = scoreAiRegression(
        { ...baseDefinition, requiredWiring: [option] },
        response,
        catalog,
        options,
      );
      return {
        option,
        check: result.checks.find(
          ({ code }) => code === `wiring:${option.name}`,
        ),
      };
    });
    const accepted = attempts.find(({ check }) => check?.pass);
    return {
      code: `wiring:${requirement.id}`,
      pass: Boolean(accepted),
      detail: accepted
        ? `calls ${accepted.option.name} from supported subpath ${accepted.option.specifier} and retains its disposer/result`
        : `requires one captured alternative: ${requirement.options.map(({ name, specifier }) => `${name} from ${specifier}`).join(', ')}`,
    };
  });
  const sourceIndex = base.checks.findIndex(({ code }) =>
    code.startsWith('duplicate:'),
  );
  const index = sourceIndex < 0 ? base.checks.length : sourceIndex;
  const checks = [
    ...base.checks.slice(0, index),
    ...wiringChecks,
    ...base.checks.slice(index),
  ];
  const dimensions = recompute(checks);
  return {
    caseId: base.caseId,
    pass: checks.every((check) => check.pass),
    dimensions,
    checks,
  };
}

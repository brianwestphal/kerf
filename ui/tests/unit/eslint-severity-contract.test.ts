// @vitest-environment node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ESLint, Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { UI_ANALYSIS_RULES } from '../../analyzer/index.mjs';

// eslint-plugin-kerfjs and kerf-ui-analyze report many of the same KUI codes,
// and kerf-ui-doctor merges the two reports. ESLint assigns severity per rule,
// so every code one rule reports must share one analyzer classification, and
// the presets must configure the rule to match it: an analyzer `error` is an
// ESLint `error`, an analyzer `review` is an ESLint `warn` (the doctor reads a
// warning for a review code as that review finding). KUI-L017 once rode along
// in the `error`-level ui-css-values rule, so a deliberate off-scale shorthand
// failed lint while the analyzer queued it for review, and the doctor counted
// it twice with a KUI-D003 conflict.
const uiRoot = resolve(import.meta.dirname, '../..');
const { default: plugin } = (await import(
  pathToFileURL(resolve(uiRoot, '../eslint-plugin/index.js')).href
)) as { default: ESLint.Plugin };

type AnalyzerSeverity = 'error' | 'review';
const analyzerRules = UI_ANALYSIS_RULES as Record<
  string,
  { severity: AnalyzerSeverity }
>;
const expectedEslintSeverity: Record<AnalyzerSeverity, Linter.RuleSeverity> = {
  error: 'error',
  review: 'warn',
};

/** Rule name → the analyzer-classified KUI codes its messages report. */
function sharedCodesByRule(): Map<string, string[]> {
  const byRule = new Map<string, string[]>();
  for (const [name, rule] of Object.entries(plugin.rules ?? {})) {
    const messages = Object.values(
      (rule as { meta?: { messages?: Record<string, string> } }).meta
        ?.messages ?? {},
    );
    const codes = [
      ...new Set(
        messages.flatMap((template) =>
          [...template.matchAll(/\bKUI-[A-Z]\d{3}\b/g)].map(([code]) => code),
        ),
      ),
    ].filter((code) => code in analyzerRules);
    if (codes.length > 0) byRule.set(name, codes.sort());
  }
  return byRule;
}

describe('ESLint preset severities agree with the analyzer classification', () => {
  const byRule = sharedCodesByRule();

  it('finds the rules that share codes with the analyzer', () => {
    expect([...byRule.keys()].sort()).toEqual([
      'ui-component-ownership',
      'ui-css-values',
      'ui-exceptional-shorthands',
    ]);
    expect(byRule.get('ui-exceptional-shorthands')).toEqual(['KUI-L017']);
  });

  it('never mixes analyzer severities within one ESLint rule', () => {
    for (const [name, codes] of byRule) {
      const severities = new Set(
        codes.map((code) => analyzerRules[code]!.severity),
      );
      expect({ rule: name, severities: [...severities] }).toEqual({
        rule: name,
        severities: [analyzerRules[codes[0]!]!.severity],
      });
    }
  });

  it.each(['recommended-ui', 'strict-ui'])(
    '%s configures each shared-code rule at the analyzer severity',
    (preset) => {
      const rules = (plugin.configs?.[preset] as Linter.Config).rules ?? {};
      for (const [name, codes] of byRule) {
        const analyzerSeverity = analyzerRules[codes[0]!]!.severity;
        expect({ rule: name, severity: rules[`kerfjs/${name}`] }).toEqual({
          rule: name,
          severity: expectedEslintSeverity[analyzerSeverity],
        });
      }
    },
  );
});

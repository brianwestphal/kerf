#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const STABLE_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
const BETA_TAG = /^v(\d+\.\d+\.\d+)-beta\.(\d+)$/;

function parseVersion(version) {
  const match = STABLE_VERSION.exec(version);
  if (!match) throw new Error(`Invalid stable version: ${version}`);
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    const difference = leftParts[index] - rightParts[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

function nextMinor(version) {
  const [major, minor] = parseVersion(version);
  return `${major}.${minor + 1}.0`;
}

export function planBetaRelease({
  currentVersion,
  currentIsStable,
  overrideVersion,
  tags,
}) {
  const fallbackVersion = overrideVersion
    ? overrideVersion
    : currentIsStable
      ? nextMinor(currentVersion)
      : currentVersion;
  parseVersion(fallbackVersion);

  const betaTags = tags.flatMap((tag) => {
    const match = BETA_TAG.exec(tag.trim());
    return match ? [{ tag, version: match[1], number: Number(match[2]) }] : [];
  });
  const activeVersion = overrideVersion
    ? fallbackVersion
    : betaTags
        .map(({ version }) => version)
        .filter((version) => compareVersions(version, fallbackVersion) >= 0)
        .sort(compareVersions)
        .at(-1);
  const targetVersion = activeVersion ?? fallbackVersion;
  const targetTags = betaTags.filter(
    ({ version }) => version === targetVersion,
  );
  const betaNumber = Math.max(0, ...targetTags.map(({ number }) => number)) + 1;

  return {
    targetVersion,
    betaTag: `v${targetVersion}-beta.${betaNumber}`,
    source: overrideVersion
      ? 'override'
      : activeVersion
        ? 'active-beta-series'
        : currentIsStable
          ? 'next-minor'
          : 'package-version',
    previousBetaTag: targetTags
      .sort((left, right) => left.number - right.number)
      .at(-1)?.tag,
  };
}

if (process.argv[1]?.endsWith('release-beta-plan.mjs')) {
  const [currentVersion, currentIsStableRaw, overrideVersion = ''] =
    process.argv.slice(2);
  const tags = readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean);
  const plan = planBetaRelease({
    currentVersion,
    currentIsStable: currentIsStableRaw === 'true',
    overrideVersion: overrideVersion || undefined,
    tags,
  });
  process.stdout.write(
    [
      plan.targetVersion,
      plan.betaTag,
      plan.source,
      plan.previousBetaTag ?? '',
    ].join('\t'),
  );
}

import * as core from "@actions/core";

/**
 * Writes a job summary section for packages where the excluded patterns protect every version
 * that matches the include patterns and is old enough, so nothing was selected for deletion.
 *
 * @param {Array<{ package: string, versions: number, patterns: string[] }>} blockedByExclusion
 */
async function writeBlockedByExclusionSummary(blockedByExclusion = []) {
  if (!Array.isArray(blockedByExclusion) || blockedByExclusion.length === 0) return;

  core.summary.addRaw(`\n\n### ⚠️ Versions protected by excluded patterns\n\n`);
  core.summary.addRaw(`Every version that matches the include patterns and is older than the threshold is protected by the excluded patterns, so nothing was deleted for these packages. Check \`excluded-patterns\` (a pattern such as \`*.*\` also matches SNAPSHOT versions):\n\n`);
  blockedByExclusion.forEach(({ package: name, versions, patterns }) => {
    const matched = patterns.map(p => `<code>${p}</code>`).join(", ");
    core.summary.addRaw(`- <strong>${name}</strong>: ${versions} version(s), excluded by ${matched}\n`);
  });
  await core.summary.write();
}

export { writeBlockedByExclusionSummary };

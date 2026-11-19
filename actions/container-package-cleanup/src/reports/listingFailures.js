import * as core from "@actions/core";

/**
 * Writes a job summary section for package visibilities that could not be listed.
 * The cleanup continued with the packages that were found, so the result may be incomplete.
 *
 * @param {Array<{ visibility: string, reason: string }>} listingFailures
 */
async function writeListingFailuresSummary(listingFailures = []) {
  if (!Array.isArray(listingFailures) || listingFailures.length === 0) return;

  core.summary.addRaw(`\n\n### ⚠️ Incomplete package listing\n\n`);
  core.summary.addRaw(`Some packages could not be listed, so this cleanup may be incomplete. Check the token permissions and the package visibility:\n\n`);
  listingFailures.forEach(({ visibility, reason }) => {
    core.summary.addRaw(`- <strong>${visibility}</strong>: ${reason}\n`);
  });
  await core.summary.write();
}

export { writeListingFailuresSummary };

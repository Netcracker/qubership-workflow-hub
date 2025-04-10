// With a motherfucking microphone, plug it in my soul
// I'm a renegade riot getting out of control
// I'm-a keeping it alive and continue to be
// Flying like an eagle to my destiny

const core = require("@actions/core");
const OctokitWrapper = require("./wrapper");
const Report = require("./report");

async function run() {

  // const configurationPath = core.getInput('config-file-path');

  // if (configurationPath === "") {
  //   core.info("❗️ Configuration file path is empty. Try to using default path: ./.github/package-cleanup-config.yml");
  //   configurationPath = "./.github/package-cleanup-config.yml";
  // }

  const isDebug = core.getInput("debug").toLowerCase() === "true";
  const dryRun = core.getInput("dry-run").toLowerCase() === "true";
  core.info(`🔹isDebug: ${isDebug}`);
  core.info(`🔹dryRun: ${dryRun}`);

  const thresholdDays = parseInt(core.getInput('threshold-days'), 10) || 7;

  const rawIncludedTags = core.getInput('included-tags');
  const includedTags = rawIncludedTags ? rawIncludedTags.split(",") : [];

  const rawExcludedTags = core.getInput('excluded-tags');
  const excludedTags = rawExcludedTags ? rawExcludedTags.split(",") : [];

  const now = new Date();
  const thresholdDate = new Date(now.getTime() - thresholdDays * 24 * 60 * 60 * 1000);

  // core.info(`🔹Configuration Path: ${configurationPath}`);
  core.info(`🔹 Threshold Days: ${thresholdDays}`);
  core.info(`🔹 Threshold Date: ${thresholdDate}`);
  core.info(`🔹 Excluded Tags: ${excludedTags}`);
  core.info(`🔹 Included Tags: ${includedTags}`);

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  const wrapper = new OctokitWrapper(process.env.PACKAGE_TOKEN);

  const isOrganization = await wrapper.isOrganization(owner);
  core.info(`🔹Organization marker: ${isOrganization}`);

  let packages = await wrapper.listPackages(owner, 'container', isOrganization);
  let filteredPackages = packages.filter((pkg) => pkg.repository.name === repo);

  let packagesNames = filteredPackages.map((pkg) => pkg.name);

  const packagesWithVersions = await Promise.all(
    filteredPackages.map(async (pkg) => {
      const versionsForPkg = await wrapper.listVersionsForPackage(owner, pkg.package_type, pkg.name, isOrganization);
      return { package: pkg, versions: versionsForPkg };
    })
  );

  let filteredPackagesWithVersionsForDelete = packagesWithVersions.map(({ package: pkg, versions }) => {

    const verisonWithOutExclude = versions.filter((version) => {
      const createdAt = new Date(version.created_at);
      const isOldEnough = createdAt <= thresholdDate;

      if (!isOldEnough) return false;
      if (!version.metadata || !version.metadata.container || !Array.isArray(version.metadata.container.tags)) return false;
      const tags = version.metadata.container.tags;

      if (excludedTags.length > 0 && tags.some(tag => excludedTags.some(pattern => wildcardMatch(tag, pattern)))) {
        return false;
      }
      return true;
    });

    const versionsToDelete = includedTags.length > 0 ? verisonWithOutExclude.filter((version) => {
      if (!version.metadata || !version.metadata.container || !Array.isArray(version.metadata.container.tags)) return false;
      const tags = version.metadata.container.tags;
      return tags.some(tag => includedTags.some(pattern => wildcardMatch(tag, pattern)));
    }) : verisonWithOutExclude;

    const customPackage = {
      id: pkg.id,
      name: pkg.name,
      type: pkg.package_type
    };

    return { package: customPackage, versions: versionsToDelete };

  }).filter(item => item !== null && item.versions.length > 0);

  if (filteredPackagesWithVersionsForDelete.length === 0) {
    core.info("❗️ No versions to delete.");
    return;
  }

  if (isDebug) {
    core.info(`💡 Packages name: ${JSON.stringify(packagesNames, null, 2)}`);
    core.info(`::group::Delete versions Log.`);
    core.info(`💡 Package with version for delete: ${JSON.stringify(filteredPackagesWithVersionsForDelete, null, 2)}`);
    core.info(`::endgroup::`);
  }

  if (dryRun) {
    core.warning("Dry run mode enabled. No versions will be deleted.");
    return;
  }

  for (const { package: pkg, versions } of filteredPackagesWithVersionsForDelete) {
    for (const version of versions) {
      core.info(`🔹 Package: ${pkg.name} (${pkg.type}) deleting version: ${version.id} (${version.metadata.container.tags.join(", ")})`);
      await wrapper.deletePackageVersion(owner, 'container', pkg.name, version.id, isOrganization);
    }
  }

  await new Report().writeSummary(filteredPackagesWithVersionsForDelete);
  core.info("✅ All specified versions have been deleted successfully.");

}

function wildcardMatch(tag, pattern) {
  if (!pattern.includes('*')) {
    return tag.toLowerCase() === pattern.toLowerCase();
  }
  const escapedPattern = pattern.replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&');
  const regex = new RegExp(escapedPattern.replace(/\*/g, '.*'), 'i');
  return regex.test(tag);
}

run();

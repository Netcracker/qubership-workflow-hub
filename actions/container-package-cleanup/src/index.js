// With a mfkg microphone, plug it in my soul
// I'm a renegade riot getting out of control
// I'm-a keeping it alive and continue to be
// Flying like an eagle to my destiny

const core = require("@actions/core");
const OctokitWrapper = require("./utils/wrapper");
const ContainerReport = require("./reports/containerReport");
const MavenReport = require("./reports/mavenReport");
const { getStrategy } = require("./strategy/strategyRegistry");
const { deletePackageVersion } = require('./utils/deleteAction');
const log = require("@netcracker/action-logger");

async function run() {

  const isDebug = core.getInput("debug").toLowerCase() === "true";
  const dryRun = core.getInput("dry-run").toLowerCase() === "true";

  const package_type = core.getInput("package-type").toLowerCase();

  dryRun && log.warn("Dry run mode is enabled, no version will be deleted.");
  log.info(`Is debug? -> ${isDebug}`);
  log.info(`Dry run? -> ${dryRun}`);

  log.setDebug(isDebug);
  log.setDryRun(dryRun);

  const thresholdDays = parseInt(core.getInput('threshold-days'), 10);

  const batchSize = parseInt(core.getInput('batch-size'), 10) || 15;
  const maxErrors = parseInt(core.getInput('max-errors'), 10) || 5;

  let excludedTags = [];
  let includedTags = [];

  if (package_type === "container") {
    const rawIncludedTags = core.getInput('included-tags');
    includedTags = rawIncludedTags ? rawIncludedTags.split(",") : [];

    const rawExcludedTags = core.getInput('excluded-tags');
    excludedTags = rawExcludedTags ? rawExcludedTags.split(",") : [];
  }

  if (package_type === "maven") includedTags = ['*SNAPSHOT*', ...includedTags];

  const now = new Date();
  const thresholdDate = new Date(now.getTime() - thresholdDays * 24 * 60 * 60 * 1000);
  const thresholdVersions = parseInt(core.getInput('threshold-versions'), 10);

  log.info(`Threshold Days: ${thresholdDays}`);
  log.info(`Threshold Date: ${thresholdDate}`);

  excludedTags.length && log.info(`Excluded Tags: ${excludedTags}`);
  includedTags.length && log.info(`Included Tags: ${includedTags}`);

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  const wrapper = new OctokitWrapper(process.env.PACKAGE_TOKEN, isDebug);

  const isOrganization = await wrapper.isOrganization(owner);
  log.info(`Is Organization? -> ${isOrganization}`);

  // strategy will start  here for different types of packages
  log.info(`Run for type: ${package_type}, owner: ${owner}, repo: ${repo}`);
  log.info

  const packages = await wrapper.listPackages(owner, package_type, isOrganization);

  const filteredPackages = packages.filter((pkg) => pkg.repository?.name === repo);
  log.startDebugGroup('Filtered Packages')
  log.debugJSON('💡 Filtered packages:', filteredPackages);
  log.endGroup();

  log.notice(`Total packages found: ${packages.length}, packages filtered by repo '${repo}': ${filteredPackages.length}`);
  log.endGroup();

  if (packages.length === 0) {
    log.warn("No packages found.");
    return;
  }

  let totalPackagesVersions = 0;
  const packagesWithVersions = await Promise.all(
    filteredPackages.map(async (pkg) => {
      const versionsForPkg = await wrapper.listVersionsForPackage(owner, pkg.package_type, pkg.name, isOrganization);
      totalPackagesVersions += versionsForPkg.length;
      log.info(`Found ${versionsForPkg.length} versions for package: ${pkg.name}`);
      // core.info(JSON.stringify(versionsForPkg, null, 2));
      return { package: pkg, versions: versionsForPkg };
    })
  );

  log.endGroup();
  log.notice(`Total packages to process: ${filteredPackages.length}, total versions found: ${totalPackagesVersions}`);
  log.endGroup();


  // core.info(JSON.stringify(packagesWithVersions, null, 2));

  const strategyContext = {
    packagesWithVersions: packagesWithVersions,
    excludedPatterns: excludedTags,
    includedPatterns: includedTags,
    thresholdDate,
    thresholdVersions,
    wrapper,
    owner,
    isOrganization,
    debug: isDebug
  };


  const strategy = getStrategy(package_type);

  log.info(`Using strategy -> ${await strategy.toString()}`);

  const filteredPackagesWithVersionsForDelete = await strategy.execute(strategyContext);

  log.setDebug(isDebug);
  log.startDebugGroup('Packages with versions for delete');
  log.debugJSON('💡 Package with version for delete:', filteredPackagesWithVersionsForDelete);
  log.endGroup();


  log.startGroup("🚀 Starting package version deletion process");
  const reportContext = {
    filteredPackagesWithVersionsForDelete,
    thresholdDays,
    thresholdDate,
    dryRun,
    includedTags,
    excludedTags
  };

  // dryRun && await showReport(reportContext, package_type);
  let deleteStatus = [];
  try {
    if (filteredPackagesWithVersionsForDelete.length > 0) {
      deleteStatus = await deletePackageVersion(filteredPackagesWithVersionsForDelete,
        { wrapper, owner, isOrganization, batchSize, maxErrors, dryRun, debug: isDebug });
    }

  } catch (error) {
    core.setFailed(error.message || String(error));
  }
  log.endGroup();

  await showReport({ ...reportContext, deleteStatus }, package_type);

  deleteStatus.some(r => r.success === false) ?
    core.setFailed("❗️ Action completed with errors. Please check the logs and the report above.") :
    log.success("✅ Action completed.");
}

async function showReport(context, type = 'container') {
  const report = type === 'container' ? new ContainerReport() : new MavenReport();
  await report.writeSummary(context);

}

run();

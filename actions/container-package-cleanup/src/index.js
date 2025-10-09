// With a motherfucking microphone, plug it in my soul
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

  // const configurationPath = core.getInput('config-file-path');

  // if (configurationPath === "") {
  //   core.info("❗️ Configuration file path is empty. Try to using default path: ./.github/package-cleanup-config.yml");
  //   configurationPath = "./.github/package-cleanup-config.yml";
  // }

  const isDebug = core.getInput("debug").toLowerCase() === "true";
  const dryRun = core.getInput("dry-run").toLowerCase() === "true";

  const package_type = core.getInput("package-type").toLowerCase();

  log.info(`Is debug? -> ${isDebug}`);
  log.info(`Dry run? -> ${dryRun}`);

  const thresholdDays = parseInt(core.getInput('threshold-days'), 10);

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

  // core.info(`Configuration Path: ${configurationPath}`);
  log.info(`Threshold Days: ${thresholdDays}`);
  log.info(`Threshold Date: ${thresholdDate}`);

  excludedTags.length && log.info(`Excluded Tags: ${excludedTags}`);
  includedTags.length && log.info(`Included Tags: ${includedTags}`);

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  const wrapper = new OctokitWrapper(process.env.PACKAGE_TOKEN);

  const isOrganization = await wrapper.isOrganization(owner);
  log.info(`Is Organization? -> ${isOrganization}`);

  // strategy will start  here for different types of packages
  log.info(`Package type: ${package_type}, owner: ${owner}, repo: ${repo}`);

  // let packages = await wrapper.listPackages(owner, 'container', isOrganization);

  const packages = await wrapper.listPackages(owner, package_type, isOrganization);

  const filteredPackages = packages.filter((pkg) => pkg.repository?.name === repo);
  log.info(`Filtered Packages: ${JSON.stringify(filteredPackages, null, 2)}`);


  log.info(`Found ${packages.length} packages of type '${package_type}' for owner '${owner}'`);

  if (packages.length === 0) {
    log.warn("No packages found.");
    return;
  }

  const packagesWithVersions = await Promise.all(
    filteredPackages.map(async (pkg) => {
      const versionsForPkg = await wrapper.listVersionsForPackage(owner, pkg.package_type, pkg.name, isOrganization);
      log.info(`Found ${versionsForPkg.length} versions for package: ${pkg.name}`);
      // core.info(JSON.stringify(versionsForPkg, null, 2));
      return { package: pkg, versions: versionsForPkg };
    })
  );


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
  // // let strategy = package_type === 'container' ? new ContainerStrategy() : new MavenStrategy();

  log.log(`Using strategy -> ${await strategy.toString()}`);

  const filteredPackagesWithVersionsForDelete = await strategy.execute(strategyContext);
  // core.info(`Filtered Packages with Versions for Delete: ${JSON.stringify(filteredPackagesWithVersionsForDelete, null, 2)}`);

  log.setDebug(isDebug);
  log.group('Delete versions Log')
  log.debugJSON('💡 Package with version for delete:', filteredPackagesWithVersionsForDelete);
  log.groupEnd();


  const reportContext = {
    filteredPackagesWithVersionsForDelete,
    thresholdDays,
    thresholdDate,
    dryRun,
    includedTags,
    excludedTags
  };

  if (dryRun) {
    log.warn("Dry run mode enabled. No versions will be deleted.");
    await showReport(reportContext, package_type);
    return;
  }

  try {
    if (!dryRun && filteredPackagesWithVersionsForDelete.length > 0) {
      await deletePackageVersion(filteredPackagesWithVersionsForDelete, { wrapper, owner, isOrganization });
    }

  } catch (error) {
    core.setFailed(error.message || String(error));
  }

  await showReport(reportContext, package_type);
  log.success("✅ Action completed.");
}

async function showReport(context, type = 'container') {
  const report = type === 'container' ? new ContainerReport() : new MavenReport();
  await report.writeSummary(context);

}

run();

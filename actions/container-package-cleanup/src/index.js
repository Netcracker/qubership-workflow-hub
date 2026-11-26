import * as core from "@actions/core";
import process from "node:process";
import OctokitWrapper from "./utils/wrapper.js";
import ContainerReport from "./reports/containerReport.js";
import MavenReport from "./reports/mavenReport.js";
import { getStrategy, isSupportedPackageType, SUPPORTED_PACKAGE_TYPES } from "./strategy/strategyRegistry.js";
import { deletePackageVersion } from './utils/deleteAction.js';
import { parseNonNegativeInt, parseIntWithDefault, parseBooleanInput, parseList } from './utils/inputs.js';
import { resolveFilters } from './utils/filters.js';
import { writeBlockedByExclusionSummary } from './reports/blockedByExclusion.js';
import { writeListingFailuresSummary } from './reports/listingFailures.js';
import log from "@qubership/action-logger";

async function run() {

  // dry-run is a safety switch: a mistyped value must fail the action instead of silently selecting real deletion
  let isDebug;
  let dryRun;
  try {
    isDebug = parseBooleanInput('debug', core.getInput("debug"));
    dryRun = parseBooleanInput('dry-run', core.getInput("dry-run"));
  } catch (error) {
    core.setFailed(error.message);
    return;
  }

  const package_type = core.getInput("package-type").toLowerCase();

  dryRun && log.warn("Dry run mode is enabled, no version will be deleted.");
  log.info(`Is debug? -> ${isDebug}`);
  log.info(`Dry run? -> ${dryRun}`);

  log.setDebug(isDebug);
  log.setDryRun(dryRun);

  // The package type and the retention settings decide what gets deleted: validate them strictly before doing anything else.
  let thresholdDays;
  let thresholdVersions;
  let batchSize;
  let maxErrors;
  try {
    if (!isSupportedPackageType(package_type)) {
      throw new Error(`Invalid 'package-type' input: "${package_type}". Supported values: ${SUPPORTED_PACKAGE_TYPES.join(', ')}.`);
    }
    thresholdDays =parseNonNegativeInt('threshold-days', core.getInput('threshold-days'));
    // threshold-versions is only used by the Maven strategy
    thresholdVersions = package_type === "maven"
      ? parseNonNegativeInt('threshold-versions', core.getInput('threshold-versions'))
      : parseInt(core.getInput('threshold-versions'), 10);
    // an empty value or 0 selects the default; negative and non-integer values are rejected
    batchSize = parseIntWithDefault('batch-size', core.getInput('batch-size'), 15);
    maxErrors = parseIntWithDefault('max-errors', core.getInput('max-errors'), 5);
  } catch (error) {
    core.setFailed(error.message);
    return;
  }

  // tags and patterns are the same kind of filter: merge them; exclusions win over inclusions
  const { included: includedTags, excluded: excludedTags } = resolveFilters(package_type, {
    includedTags: parseList(core.getInput('included-tags')),
    includedPatterns: parseList(core.getInput('included-patterns')),
    excludedTags: parseList(core.getInput('excluded-tags')),
    excludedPatterns: parseList(core.getInput('excluded-patterns')),
  });

  const now = new Date();
  const thresholdDate = new Date(now.getTime() - thresholdDays * 24 * 60 * 60 * 1000);
  // A huge threshold-days gives a date outside the Date range: fail now instead of comparing with an invalid date later
  if (Number.isNaN(thresholdDate.getTime())) {
    core.setFailed(`Invalid 'threshold-days' input: "${thresholdDays}". The cutoff date is out of range.`);
    return;
  }

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

  const packages = await wrapper.listPackages(owner, package_type, isOrganization);
  // visibilities that could not be listed (the listing continued with the rest)
  const listingFailures = wrapper.listingFailures ?? [];

  const filteredPackages = packages.filter((pkg) => pkg.repository?.name === repo);
  log.startDebugGroup('Filtered Packages')
  try {
    log.debugJSON('💡 Filtered packages:', filteredPackages);
  } finally {
    // startDebugGroup opens a group only in debug mode, so close it only then
    if (isDebug) log.endGroup();
  }

  log.notice(`Total packages found: ${packages.length}, packages filtered by repo '${repo}': ${filteredPackages.length}`);

  if (filteredPackages.length === 0) {
    log.warn(`No packages found for repository '${repo}' (packages found for owner '${owner}': ${packages.length}).`);
    await writeListingFailuresSummary(listingFailures);
    return;
  }

  let totalPackagesVersions = 0;
  const packagesWithVersions = await Promise.all(
    filteredPackages.map(async (pkg) => {
      const versionsForPkg = await wrapper.listVersionsForPackage(owner, pkg.package_type, pkg.name, isOrganization);
      totalPackagesVersions += versionsForPkg.length;
      log.info(`Found ${versionsForPkg.length} versions for package: ${pkg.name}`);
      return { package: pkg, versions: versionsForPkg };
    })
  );

  log.notice(`Total packages to process: ${filteredPackages.length}, total versions found: ${totalPackagesVersions}`);

  // Filled by the strategy when it has to skip part of the cleanup to stay safe
  const incompleteCleanup = [];
  // Filled by the Maven strategy when excluded patterns protect every version that would otherwise be deleted
  const blockedByExclusion = [];

  const strategyContext = {
    incompleteCleanup,
    blockedByExclusion,
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
  try {
    log.debugJSON('💡 Package with version for delete:', filteredPackagesWithVersionsForDelete);
  } finally {
    if (isDebug) log.endGroup();
  }


  const reportContext = {
    filteredPackagesWithVersionsForDelete,
    thresholdDays,
    thresholdDate,
    dryRun,
    includedTags,
    excludedTags,
    incompleteCleanup
  };

  let deleteStatus = [];
  try {
    if (filteredPackagesWithVersionsForDelete.length > 0) {
      deleteStatus = await deletePackageVersion(filteredPackagesWithVersionsForDelete,
        { wrapper, owner, isOrganization, batchSize, maxErrors, dryRun, debug: isDebug });
    }

  } catch (error) {
    core.setFailed(error.message || String(error));
  }

  await showReport({ ...reportContext, deleteStatus }, package_type);
  await writeListingFailuresSummary(listingFailures);
  await writeBlockedByExclusionSummary(blockedByExclusion);

  deleteStatus.some(r => r.success === false) ?
    core.setFailed("❗️ Action completed with errors. Please check the logs and the report above.") :
    log.success("✅ Action completed.");
}

async function showReport(context, type = 'container') {
  const report = type === 'container' ? new ContainerReport() : new MavenReport();
  await report.writeSummary(context);

}

run().catch((error) => {
  core.setFailed(error?.message || String(error));
});
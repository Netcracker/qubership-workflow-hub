/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 763:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(958);
class ContainerReport {
    async writeSummary(context) {

        const {
            filteredPackagesWithVersionsForDelete,
            dryRun,
            thresholdDays,
            thresholdDate,
            includedTags,
            excludedTags
        } = context;

        if (!filteredPackagesWithVersionsForDelete || filteredPackagesWithVersionsForDelete.length === 0) {
            core.info("❗️No packages or versions to delete.");
            return;
        }

        // Calculate summary statistics.

        const dryRunText = dryRun ? "(Dry Run)" : "";
        const totalPackages = filteredPackagesWithVersionsForDelete.length;
        const totalDeletedVersions = filteredPackagesWithVersionsForDelete.reduce((total, item) => total + item.versions.length, 0);

        const tableData = [
            [
                { data: "Package", header: true },
                { data: "Deleted Versions", header: true }
            ]
        ];

        filteredPackagesWithVersionsForDelete.forEach(({ package: pkg, versions }) => {

            const pkgInfo = `<strong>${pkg.name}</strong>&#10;(ID: ${pkg.id})`;

            const versionsInfo = versions
                .map(({ id, name, metadata }) => {
                    const tags = metadata?.container?.tags ?? [];
                    const label = tags.length ? tags.join(', ') : `<em>${name}</em>`;
                    return `• <code>${id}</code> — ${label}`;
                })
                .join('<br>');

            tableData.push([pkgInfo, versionsInfo]);
        });

        core.summary.addRaw(`## 🎯 Container Package Cleanup Summary ${dryRunText}\n\n`);
        core.summary.addRaw(`**Threshold:** versions older than **${thresholdDays} days** (created before **${thresholdDate.toISOString().slice(0, 10)}**)\n\n`);
        core.summary.addRaw(`**Total Packages Processed:** ${totalPackages}  \n`);
        core.summary.addRaw(`**Total Deleted Versions:** ${totalDeletedVersions}\n\n`);
        core.summary.addRaw(`---\n\n`);
        core.summary.addRaw(`**Parameters:**\n\n`);
        core.summary.addRaw(`- Threshold Days: ${thresholdDays}\n`);
        core.summary.addRaw(`- Threshold Date: ${thresholdDate.toISOString().slice(0, 10)}\n`);

        core.summary.addRaw(`- Included Tags Patterns: ${includedTags.length ? includedTags.map(t => `<code>${t}</code>`).join(", ") : "<code>None</code>"}\n`);
        core.summary.addRaw(`- Excluded Tags Patterns: ${excludedTags.length ? excludedTags.map(t => `<code>${t}</code>`).join(", ") : "<code>None</code>"}\n\n`);


        core.summary.addRaw(`---\n\n`);
        core.summary.addTable(tableData);
        core.summary.addRaw(`\n\n✅ Cleanup operation completed successfully.`);

        await core.summary.write();
    }
}

module.exports = ContainerReport;

/***/ }),

/***/ 751:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(958);

class MavenReport {

    /**
   * @param {Array<{package: {id, name, type}, versions: Array<{name, created_at}>}>} filteredPackagesWithVersionsForDelete
   * @param {boolean} dryRun
   * @param {number} thresholdDays    // Number of days 'older' than which versions are deleted
   * @param {Date} thresholdDate      // Threshold date - everything created before it is deleted
   * @param {string[]} includedTags   // Patterns for searching by version name
   */

    async writeSummary(context) {
        const {
            filteredPackagesWithVersionsForDelete,
            dryRun,
            thresholdDays,
            thresholdDate,
            includedTags,
            excludedTags
        } = context;

        if (!filteredPackagesWithVersionsForDelete || filteredPackagesWithVersionsForDelete.length === 0) {
            core.info("❗️No packages or versions to delete.");
            return;
        }

        const dryRunText = dryRun ? "(Dry Run)" : "";
        const totalPackages = filteredPackagesWithVersionsForDelete.length;
        const totalDeletedVersions = filteredPackagesWithVersionsForDelete.reduce((sum, item) => sum + item.versions.length, 0);


        const tableData = [
            [
                { data: "Package", header: true },
                { data: "Version", header: true },
                { data: "Created At", header: true }
            ]
        ];

        // Prepare table data
        filteredPackagesWithVersionsForDelete.forEach(({ package: pkg, versions }) => {
            versions.forEach(version => {

                const pkgInfo = `<strong>${pkg.name}</strong><br/>(ID: ${pkg.id})`;
                const versionInfo = `<code>${version.name}</code>`;
                const createdAt = new Date(version.created_at).toISOString();
                tableData.push([pkgInfo, versionInfo, createdAt]);
            });
        });

        core.summary.addRaw(`## 🎯 Container Package Cleanup Summary ${dryRunText}\n\n`);
        core.summary.addRaw(`**Threshold:** versions older than **${thresholdDays} days** (created before **${thresholdDate.toISOString().slice(0, 10)}**)\n\n`);
        core.summary.addRaw(`**Total Packages Processed:** ${totalPackages}  \n`);
        core.summary.addRaw(`**Total Deleted Versions:** ${totalDeletedVersions}\n\n`);
        core.summary.addRaw(`---\n\n`);
        core.summary.addRaw(`**Parameters:**\n\n`);
        core.summary.addRaw(`- Threshold Days: ${thresholdDays}\n`);
        core.summary.addRaw(`- Threshold Date: ${thresholdDate.toISOString().slice(0, 10)}\n`);

        includedTags.length && core.summary.addRaw(`- Included Patterns: ${includedTags.length ? includedTags.map(t => `<code>${t}</code>`).join(", ") : "None"}\n`);
        excludedTags.length && core.summary.addRaw(`- Excluded Patterns: ${excludedTags.length ? excludedTags.map(t => `<code>${t}</code>`).join(", ") : "None"}\n\n`);

        core.summary.addRaw(`---\n\n`);
        core.summary.addTable(tableData);
        core.summary.addRaw(`\n\n✅ Cleanup operation completed successfully.`);

        await core.summary.write();
    }
}

module.exports = MavenReport;


/***/ }),

/***/ 817:
/***/ ((module) => {

/**
 * Abstract class for package strategies.
 * This class should be extended by specific package strategies like MavenStrategy or ContainerStrategy.
 * It defines the contract for executing the strategy and provides a default string representation.
 */

class AbstractPackageStrategy {
    constructor() {
        if (new.target === AbstractPackageStrategy) {
            throw new TypeError("Cannot instantiate AbstractPackageStrategy directly");
        }

        this.name = this.constructor.name;
    }

    /**
     * Execute the strategy to filter packages and versions based on the provided context.
     * @param {Object} context - Execution context containing necessary data for filtering.
     * @returns {Array<{ package: object, versions: object[] }>}
     */
    // biome-ignore lint/correctness/noUnusedFunctionParameters: abstract method
    execute(context) {
        throw new Error(`${this.name}: method 'execute(context)' must be implemented.`);
    }

    /**
     * Returns a string representation of the strategy.
     */
    toString() {
        return this.name;
    }
}

module.exports = AbstractPackageStrategy;


/***/ }),

/***/ 245:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(958);
const AbstractPackageStrategy = __nccwpck_require__(817);
const WildcardMatcher = __nccwpck_require__(540);

class ContainerStrategy extends AbstractPackageStrategy {
    constructor() {
        super();
        this.name = 'Container Strategy';
        this.wildcardMatcher = new WildcardMatcher();
    }

    async parse(raw) {
        try {
            const data = Array.isArray(raw) ? raw : JSON.parse(raw);
            return data.map(({ package: pkg, versions }) => ({
                id: pkg.id,
                name: pkg.name,
                packageType: pkg.package_type,
                repository: pkg.repository.full_name,
                createdAt: pkg.created_at,
                updatedAt: pkg.updated_at,
                versions: (versions || []).map(v => ({
                    id: v.id,
                    name: v.name,
                    metadata: {
                        container: {
                            tags: Array.isArray(v.metadata?.container?.tags)
                                ? v.metadata.container.tags
                                : []
                        }
                    },
                    createdAt: v.created_at,
                    updatedAt: v.updated_at
                }))
            }));
        } catch (err) {
            core.setFailed(`Action failed: ${err.message}`);
        }
    }

    /**
      * @param {Object} params
      * @param {Array<{ package: Object, versions: Array }>|string} params.packagesWithVersions
      * @param {string[]} params.excludedPatterns
      * @param {string[]} params.includedPatterns
      * @param {Date} params.thresholdDate
      * @param {Object} params.wrapper
      * @param {string} params.owner
      * @param {boolean} [params.debug=false]
      * @returns {Promise<Array<{ package: Object, versions: Array }>>}
      */
    async execute({ packagesWithVersions, excludedPatterns = [], includedPatterns = [], thresholdDate, wrapper, owner, debug = false }) {
        core.info(`Executing ContainerStrategy on ${Array.isArray(packagesWithVersions) ? packagesWithVersions.length : 'unknown'} packages.`);

        const excluded = excludedPatterns.map(p => p.toLowerCase());
        const included = includedPatterns.map(p => p.toLowerCase());
        const packages = await this.parse(packagesWithVersions);
        const result = [];

        const ownerLC = typeof owner === 'string' ? owner.toLowerCase() : owner;

        for (const pkg of packages) {
            // Protected tags: latest + those that match excludedPatterns
            const protectedTags = new Set();
            for (const v of pkg.versions) {
                for (const tag of v.metadata.container.tags) {
                    const low = tag.toLowerCase();
                    if (low === 'latest' || excluded.some(pat => this.wildcardMatcher.match(low, pat))) {
                        protectedTags.add(tag);
                    }
                }
            }

            const imageLC = pkg.name.toLowerCase();
            // Gathering digests of protected tags
            const protectedDigests = new Set();
            for (const tag of protectedTags) {
                try {
                    const ds = await wrapper.getManifestDigests(ownerLC, imageLC, tag);
                    if (Array.isArray(ds)) ds.forEach(d => { protectedDigests.add(d) });
                    else if (ds) protectedDigests.add(ds);
                } catch (e) {
                    if (debug) core.warning(`Failed to fetch manifest for ${pkg.name}:${tag} — ${e.message}`);
                }
            }

            // 1) Basic filtering by date and excludedPatterns for tagged/orphan
            const withoutExclude = pkg.versions.filter(v => {
                if (new Date(v.createdAt) > thresholdDate) return false;
                const tags = v.metadata.container.tags.map(t => t.toLowerCase());
                if (tags.includes('latest')) return false;
                if (excluded.some(pat => tags.some(t => this.wildcardMatcher.match(t, pat)))) {
                    return false;
                }
                return true;
            });

            // 2) Selecting tagged versions by includePatterns
            const taggedToDelete = included.length > 0
                ? withoutExclude.filter(v =>
                    v.metadata.container.tags
                        .map(t => t.toLowerCase())
                        .some(t => included.some(pat => this.wildcardMatcher.match(t, pat)))
                )
                : withoutExclude.filter(v => v.metadata.container.tags.length > 0);

            if (debug) core.info(` [${pkg.name}] taggedToDelete: ${taggedToDelete.map(v => v.name).join(', ')}`);

            // 3) Gathering manifest digests for each tagged
            const digestMap = new Map();
            for (const v of taggedToDelete) {
                const digs = new Set();
                for (const tag of v.metadata.container.tags) {
                    try {
                        const ds = await wrapper.getManifestDigests(ownerLC, pkg.name, tag);
                        if (Array.isArray(ds)) ds.forEach(d => { digs.add(d) });
                        else if (ds) digs.add(ds);
                    } catch (e) {
                        if (debug) core.warning(`Failed to fetch manifest ${pkg.name}:${tag} — ${e.message}`);
                    }
                }
                digestMap.set(v.name, digs);
            }

            // 4) Arch layers: from withoutExclude
            const archLayers = withoutExclude.filter(v =>
                v.metadata.container.tags.length === 0 &&
                Array.from(digestMap.values()).some(digs => digs.has(v.name))
            );
            if (debug) core.info(` [${pkg.name}] archLayers: ${archLayers.map(v => v.name).join(', ')}`);

            // 5) Sorting tagged + their archLayers
            const ordered = [];
            const used = new Set();
            for (const v of taggedToDelete) {
                ordered.push(v);
                const digs = digestMap.get(v.name) || new Set();
                for (const layer of archLayers) {
                    if (!used.has(layer.name) && digs.has(layer.name)) {
                        ordered.push(layer);
                        used.add(layer.name);
                    }
                }
            }

            // 6) Dangling: only by date, without tags, not in ordered and not in protectedDigests
            const danglingLayers = pkg.versions.filter(v =>
                new Date(v.createdAt) <= thresholdDate &&
                v.metadata.container.tags.length === 0 &&
                !Array.from(digestMap.values()).some(digs => digs.has(v.name)) &&
                !protectedDigests.has(v.name) &&
                !ordered.some(o => o.name === v.name)
            );
            if (debug && danglingLayers.length) {
                core.info(` [${pkg.name}] danglingLayers: ${danglingLayers.map(v => v.name).join(', ')}`);
            }

            const toDelete = [...ordered, ...danglingLayers];
            if (toDelete.length > 0) {
                result.push({
                    package: { id: pkg.id, name: pkg.name, type: pkg.packageType },
                    versions: toDelete
                });
            }
        }

        return result;
    }

    isValidMetadata(version) {
        return Array.isArray(version?.metadata?.container?.tags);
    }

    toString() {
        return this.name;
    }
}

module.exports = ContainerStrategy;

/***/ }),

/***/ 745:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(958);
const WildcardMatcher = __nccwpck_require__(540);
const AbstractPackageStrategy = __nccwpck_require__(817);

class MavenStrategy extends AbstractPackageStrategy {
    constructor() {
        super();
        this.name = 'Maven Strategy';
    }

    async execute({ packagesWithVersions, excludedPatterns, includedPatterns, thresholdDate, thresholdVersions, debug = false }) {

        // includedTags = ['*SNAPSHOT*', ...includedTags];
        const wildcardMatcher = new WildcardMatcher();

        // Filter packages with versions based on the threshold date and patterns
        const filteredPackagesWithVersionsForDelete = packagesWithVersions.map(({ package: pkg, versions }) => {

            // if (versions.length === 1) return core.info(`Skipping package: ${pkg.name} because it has only 1 version.`), null;
            if (versions.length === 1) {
                core.info(`Skipping package: ${pkg.name} because it has only 1 version.`);
                return null;
            }

            let versionForDelete = versions.filter((version) => {
                const createdAt = new Date(version.created_at);
                const isOldEnough = createdAt <= thresholdDate;

                debug && core.info(`Checking package: ${pkg.name} version: ${version.name}, created at: ${createdAt}, Threshold date: ${thresholdDate}, Is old enough: ${isOldEnough}`);

                if (!isOldEnough) return false;

                if (excludedPatterns.some(pattern => wildcardMatcher.match(version.name, pattern))) return false;

                return includedPatterns.some(pattern => wildcardMatcher.match(version.name, pattern));

            });

            if (versionForDelete.length === 0) {

                debug && core.info(`No versions found for package: ${pkg.name} that match the criteria.`);
                return null;
            }
            if (versionForDelete.length <= thresholdVersions) {
                debug && core.info(`Skipping package: ${pkg.name} because it has less than ${thresholdVersions} versions to delete.`);
                return null;
            }

            // Sort versions by creation date in descending order
            versionForDelete.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            // Remove the most recent version (the first one after sorting)
            if (versionForDelete.length > thresholdVersions) {
                versionForDelete = versionForDelete.slice(thresholdVersions);
            }

            const customPackage = {
                id: pkg.id,
                name: pkg.name,
                type: pkg.package_type
            };

            return { package: customPackage, versions: versionForDelete };

        }).filter(Boolean);

        // debug && core.info(`Filtered packages with Maven type: ${JSON.stringify(filteredPackagesWithVersionsForDelete, null, 2)}`);

        return filteredPackagesWithVersionsForDelete;
    }

    async toString() {
        return this.name;
    }
}

module.exports = MavenStrategy;

/***/ }),

/***/ 602:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const MavenStrategy = __nccwpck_require__(745);
const ContainerStrategy = __nccwpck_require__(245);

const strategyRegistry = {
    maven: MavenStrategy,
    container: ContainerStrategy,
};

function getStrategy(packageType) {
    const StrategyClass = strategyRegistry[packageType];

    if (!StrategyClass) {
        throw new Error(`Unsupported package type: ${packageType}`);
    }

    const instance = new StrategyClass();

    if (typeof instance.execute !== 'function') {
        throw new Error(`Strategy ${packageType} must implement 'execute()'`);
    }

    return instance;
}

module.exports = { getStrategy };

/***/ }),

/***/ 591:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const log = __nccwpck_require__(621);

/**
 *
 * @param {Array<{package:{id,name,type}, versions:Array<{id,name,metadata}>}>} filtered
 * @param {{ wrapper:any, owner:string, isOrganization?:boolean, dryRun?:boolean }} ctx
 */
async function deletePackageVersion(filtered, { wrapper, owner, isOrganization = true, dryRun = false } = {}) {
  if (!Array.isArray(filtered) || filtered.length === 0) {
    log.warn("Nothing to delete.");
    return;
  }
  if (!wrapper || typeof wrapper.deletePackageVersion !== "function") {
    throw new Error("wrapper.deletePackageVersion is required");
  }
  if (!owner) {
    throw new Error("owner is required");
  }

  const ownerLC = owner.toLowerCase();

  for (const { package: pkg, versions } of filtered) {
    const imageLC = (pkg.name || "").toLowerCase();
    const type = pkg.type; // "container" | "maven" ...

    for (const v of versions) {
      const tags = v.metadata?.container?.tags ?? [];
      const detail = type === "maven" ? v.name : (tags.length ? tags.join(", ") : v.name);

      log.setDryRun(dryRun);
      log.dryrun(`${ownerLC}/${imageLC} (${type}) — would delete version ${v.id} (${detail})`);

      try {
        log.info(`Deleting ${ownerLC}/${imageLC} (${type}) — version ${v.id} (${detail})`);
        await wrapper.deletePackageVersion(ownerLC, type, imageLC, v.id, isOrganization);
      } catch (error) {
        const msg = String(error?.message || error);

        if (/more than 5000 downloads/i.test(msg)) {
          log.warn(`Skipping ${imageLC} v:${v.id} (${detail}) — too many downloads.`);
          continue;
        }

        if (/404|not found/i.test(msg)) {
          log.warn(`Version not found: ${imageLC} v:${v.id} — probably already deleted.`);
          continue;
        }

        if (/403|rate.?limit|insufficient permissions/i.test(msg)) {
          log.warn(`Permission/rate issue for ${imageLC} v:${v.id}: ${msg}`);
          throw error;
        }

        log.error(`Failed to delete ${imageLC} v:${v.id} (${detail}) — ${msg}`);
      }
    }
  }
}

module.exports = { deletePackageVersion };


/***/ }),

/***/ 540:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const escapeStringRegexp = __nccwpck_require__(432);

class WildcardMatcher {
  constructor() {
    this.name = 'WildcardMatcher';
  }

  match(tag, pattern) {
    const t = tag.toLowerCase();
    const p = pattern.toLowerCase();
    // Special case for 'semver' -- searching strings like '1.2.3', 'v1.2.3', '1.2.3-alpha', 'v1.2.3-fix'
    let regexPattern;
    if (p === 'semver') {
      regexPattern = '^[v]?\\d+\\.\\d+\\.\\d+[-]?.*';
      const re = new RegExp(regexPattern, 'i');
      return re.test(t);
    }
    // Special case for '?*' — alpha-number only and at least one digit
    if (p === '?*') {
      // /^[a-z0-9]+$/ apha-number only
      // /\d/ at least one digit
      return /^[a-z0-9]+$/.test(t) && /\d/.test(t);
    }

    // No wildcards at all — strict comparison
    if (!p.includes('*') && !p.includes('?')) {
      return t === p;
    }

    // General case: build RegExp, escape special characters, then *→.* and ?→.
    console.log(`Matching tag "${t}" against pattern "${p}"`);
    // First replace * and ? with unique markers, then escape, then return them as .*
    const wildcardPattern = p.replace(/\*/g, '__WILDCARD_STAR__').replace(/\?/g, '__WILDCARD_QM__');
    const escaped = escapeStringRegexp(wildcardPattern)
      .replace(/__WILDCARD_STAR__/g, '.*')
      .replace(/__WILDCARD_QM__/g, '.');
    console.log(`Transformed pattern: ${escaped}`);

    const re = new RegExp(`^${escaped}$`, 'i');
    return re.test(t);
  }
}

module.exports = WildcardMatcher;


/***/ }),

/***/ 827:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const github = __nccwpck_require__(394);
const { exec } = __nccwpck_require__(421);
const util = __nccwpck_require__(975);
const execPromise = util.promisify(exec);

class OctokitWrapper {

  /**
   * Initializes the OctokitWrapper with an authentication token.
   * @param {string} authToken - The GitHub authentication token.
   */
  constructor(authToken) {
    this.octokit = github.getOctokit(authToken);
  }

  /**
   * Determines if the given username belongs to an organization.
   * @param {string} username - The username to check.
   * @returns {Promise<boolean>} - True if the username belongs to an organization, false otherwise.
   */
  async isOrganization(username) {
    try {
      console.log(`Checking if ${username} is an organization...`);
      const response = await this.octokit.rest.users.getByUsername({ username });
      return response.data.type !== 'User';
    } catch (error) {
      console.error(`Error fetching user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Lists packages for a user or organization.
   * @param {string} owner - The username or organization name.
   * @param {string} package_type - The type of the package (e.g., container).
   * @param {boolean} type - True if the owner is an organization, false if it's a user.
   * @returns {Promise<Array>} - A list of packages.
   */
  async listPackages(owner, package_type, type) {
    return type ? await this.listPackagesForOrganization(owner, package_type) : this.listPackagesForUser(owner, package_type);
  }

  /**
   * Lists versions for a specific package owned by a user or organization.
   * @param {string} owner - The username or organization name.
   * @param {string} package_type - The type of the package (e.g., container).
   * @param {string} package_name - The name of the package.
   * @param {boolean} type - True if the owner is an organization, false if it's a user.
   * @returns {Promise<Array>} - A list of package versions.
   */
  async listVersionsForPackage(owner, package_type, package_name, type) {
    return type ? this.getPackageVersionsForOrganization(owner, package_type, package_name) : this.getPackageVersionsForUser(owner, package_type, package_name);
  }

  /**
   * Lists packages for an organization.
   * @param {string} org - The organization name.
   * @param {string} package_type - The type of the package (e.g., container).
   * @returns {Promise<Array>} - A list of packages.
   */
  async listPackagesForOrganization(org, package_type) {
    try {
      return await this.octokit.paginate(this.octokit.rest.packages.listPackagesForOrganization,
        {
          org: org,
          package_type,
          per_page: 100,      // max 100 packages per request
        }
      );
    } catch (error) {
      console.error(`Error fetching packages for organization ${org}:`, error);
      throw error;
    }
  }

  /**
   * Lists packages for a user.
   * @param {string} username - The username.
   * @param {string} package_type - The type of the package (e.g., container).
   * @returns {Promise<Array>} - A list of packages.
   */
  async listPackagesForUser(username, package_type) {
    try {
      return await this.octokit.paginate(this.octokit.rest.packages.listPackagesForUser,
        {
          username,
          package_type,
          per_page: 100,      // max 100 packages per request
        }
      );

    } catch (error) {
      console.error(`Error fetching packages for user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Gets all versions of a specific package owned by a user.
   * @param {string} owner - The username.
   * @param {string} package_type - The type of the package (e.g., container).
   * @param {string} package_name - The name of the package.
   * @returns {Promise<Array>} - A list of package versions.
   */
  async getPackageVersionsForUser(owner, package_type, package_name) {
    try {
      console.log(`Owner: ${owner}, Package Type: ${package_type}, Package Name: ${package_name}`);
      return await this.octokit.paginate(this.octokit.rest.packages.getAllPackageVersionsForPackageOwnedByUser,
        {
          package_type,
          package_name,
          username: owner,
          per_page: 100,
        });
    } catch (error) {
      console.error(`Error fetching package versions for ${owner}/${package_name}:`, error);
      throw error;
    }
  }

  /**
   * Gets all versions of a specific package owned by an organization.
   * @param {string} org - The organization name.
   * @param {string} package_type - The type of the package (e.g., container).
   * @param {string} package_name - The name of the package.
   * @returns {Promise<Array>} - A list of package versions.
   */
  async getPackageVersionsForOrganization(org, package_type, package_name) {
    try {
       console.log(`Owner: ${org}, Package Type: ${package_type}, Package Name: ${package_name}`);
      return await this.octokit.paginate(this.octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg,
        {
          package_type,
          package_name,
          org,
          per_page: 100,
        });

    } catch (error) {
      console.error(`Error fetching package versions for ${org}/${package_name}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a specific package version.
   * @param {string} owner - The username or organization name.
   * @param {string} package_type - The type of the package (e.g., container).
   * @param {string} package_name - The name of the package.
   * @param {string} version_id - The unique identifier of the version to delete.
   * @param {boolean} type - True if the owner is an organization, false if it's a user.
   * @returns {Promise<void>}
   */
  async deletePackageVersion(owner, package_type, package_name, package_version_id, type) {
    try {
      if (type) {
        await this.octokit.rest.packages.deletePackageVersionForOrg({
          package_type,
          package_name,
          package_version_id,
          org: owner,
        });
      } else {
        await this.octokit.rest.packages.deletePackageVersionForUser({
          package_type,
          package_name,
          package_version_id,
          username: owner,
        });
      }
    } catch (error) {
      console.error(`Error deleting package version ${package_version_id} for ${owner}/${package_name}:`, error);
      throw error;
    }
  }

  /**
 * Returns an array of digests from the manifest list for a given tag.
 *
 * @param {string} owner — organization or user name, depending on whether the owner is
 * @param {string} packageName — container package name
 * @param {string} tag — image tag
 * @returns {Promise<string[]>} — digest list for all platforms
 */
  async getManifestDigests(owner, packageName, tag) {
    const ref = `ghcr.io/${owner}/${packageName}:${tag}`;
    // Run docker manifest inspect and parse JSON
    const { stdout } = await execPromise(`docker manifest inspect ${ref}`);
    const manifest = JSON.parse(stdout);
    // return digest from each entry in manifests
    return manifest.manifests.map(m => m.digest);
  }

}

module.exports = OctokitWrapper;

/***/ }),

/***/ 958:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 394:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 621:
/***/ ((module) => {

module.exports = eval("require")("@netcracker/action-logger");


/***/ }),

/***/ 432:
/***/ ((module) => {

module.exports = eval("require")("escape-string-regexp");


/***/ }),

/***/ 421:
/***/ ((module) => {

"use strict";
module.exports = require("node:child_process");

/***/ }),

/***/ 975:
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// With a mfkg microphone, plug it in my soul
// I'm a renegade riot getting out of control
// I'm-a keeping it alive and continue to be
// Flying like an eagle to my destiny

const core = __nccwpck_require__(958);
const OctokitWrapper = __nccwpck_require__(827);
const ContainerReport = __nccwpck_require__(763);
const MavenReport = __nccwpck_require__(751);
const { getStrategy } = __nccwpck_require__(602);
const { deletePackageVersion } = __nccwpck_require__(591);
const log = __nccwpck_require__(621);

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

  log.info(`Using strategy -> ${await strategy.toString()}`);

  const filteredPackagesWithVersionsForDelete = await strategy.execute(strategyContext);

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

module.exports = __webpack_exports__;
/******/ })()
;
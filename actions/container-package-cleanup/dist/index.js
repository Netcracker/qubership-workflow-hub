/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 667:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(647);
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

/***/ 28:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(647);

class MavenReport {

    /**
   * @param {Array<{package: {id, name, type}, versions: Array<{name, created_at}>}>} filteredPackagesWithVersionsForDelete
   * @param {boolean} dryRun
   * @param {number} thresholdDays    // количество дней «старше» которых версии удаляются
   * @param {Date} thresholdDate      // пороговая дата — всё что создано до неё удаляется
   * @param {string[]} includedTags   // паттерны для поиска по имени версии
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

/***/ 313:
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

/***/ 109:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(647);
const AbstractPackageStrategy = __nccwpck_require__(313);
const WildcardMatcher = __nccwpck_require__(220);

class ContainerStrategy extends AbstractPackageStrategy {
    constructor() {
        super();
        this.name = 'Container Strategy';
        this.wildcardMatcher = new WildcardMatcher();
    }

    async execute({ packagesWithVersions, excludedPatterns, includedPatterns, thresholdDate, wrapper, owner, isOrganization, debug = false }) {
        const excluded = excludedPatterns.map(p => p.toLowerCase());
        const included = includedPatterns.map(p => p.toLowerCase());

        const result = [];

        for (const { package: pkg, versions } of packagesWithVersions) {
            if (!Array.isArray(versions)) {
                core.warning(`Package ${pkg.name} has no versions array`);
                continue;
            }

            // 1) отфильтровываем по дате и excludedPatterns
            const withoutExclude = versions.filter(v => {
                if (!Array.isArray(v.metadata?.container?.tags)) return false;
                if (new Date(v.created_at) > thresholdDate) return false;
                const tags = v.metadata.container.tags;
                return !excluded.some(pattern => tags.some(tag => this.wildcardMatcher.match(tag, pattern))
                );
            });

            // 2) из оставшихся берём tagged-версии по includedPatterns (или все, если include пуст)
            const taggedToDelete = included.length > 0
                ? withoutExclude.filter(v =>
                    v.metadata.container.tags.some(tag => included.some(pattern => this.wildcardMatcher.match(tag, pattern))))
                : withoutExclude.filter(v => v.metadata.container.tags.length > 0);

            if (taggedToDelete.length === 0) {
                debug && core.info(`No tagged versions to delete for ${pkg.name}`);
                continue;
            }

            // 3) собираем digest’ы для каждой tagged-версии
            const digestMap = new Map();  // version.name -> Set(digests)
            for (const v of taggedToDelete) {
                const digs = new Set();
                for (const tag of v.metadata.container.tags) {
                    try {
                        const ds = await wrapper.getManifestDigests(owner, pkg.name, tag, isOrganization);
                        ds.forEach(d => digs.add(d));
                    } catch (e) {
                        debug && core.debug(`Failed to inspect manifest ${pkg.name}:${tag} — ${e.message}`);
                    }
                }
                digestMap.set(v.name, digs);
            }

            // 4) находим «сырые» слои без тегов, у которых name (sha256) попал в любой из этих сетов
            const layersToDelete = withoutExclude.filter(v =>
                v.metadata.container.tags.length === 0 &&
                // встречается ли v.name в какой-нибудь коллекции digestMap
                Array.from(digestMap.values()).some(digs => digs.has(v.name))
            );

            // 5) строим итоговый упорядоченный список: тег, его слои, следующий тег, его слои...
            const ordered = [];
            const usedLayers = new Set();
            for (const v of taggedToDelete) {
                ordered.push(v);
                const digs = digestMap.get(v.name) || new Set();
                for (const layer of layersToDelete) {
                    if (!usedLayers.has(layer.name) && digs.has(layer.name)) {
                        ordered.push(layer);
                        usedLayers.add(layer.name);
                    }
                }
            }

            // 6) если есть что удалять — пушим в result
            if (ordered.length > 0) {
                result.push({
                    package: {
                        id: pkg.id,
                        name: pkg.name,
                        type: pkg.package_type
                    },
                    versions: ordered
                });
                debug && core.info(`Versions to delete for package ${pkg.name}: ${ordered.map(v => v.id).join(', ')}`);
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


// const candidates = packagesWithVersions.filter(v => {
//     if (!Array.isArray(v.metadata?.container?.tags)) return false;
//     const createdAt = new Date(v.created_at);

//     if (createdAt > thresholdDate) return false;

//     const tags = v.metadata.container.tags || [];
//     if (excluded.length > 0 && tags.some(tag => excluded.some(pattern => this.wildcardMatcher.match(tag, pattern)))) {
//     return false;
//     }
//     return true;

// });

// let filteredPackagesWithVersionsForDelete = packagesWithVersions.map(({ package: pkg, versions }) => {

//     const versionsWithoutExclude = versions.filter((version) => {

//         if (!this.isValidMetadata(version)) return false;

//         const createdAt = new Date(version.created_at);
//         const isOldEnough = createdAt <= thresholdDate;

//         debug && core.debug(`Checking package: ${pkg.name} version: ${version.name}, created at: ${createdAt}, Threshold date: ${thresholdDate}, Is old enough: ${isOldEnough}`);

//         if (!isOldEnough) return false;

//         const tags = version.metadata.container.tags || [];

//         if (excludePatterns.length > 0 && tags.some(tag => excludePatterns.some(pattern => this.wildcardMatcher.match(tag, pattern)))) {
//             return false;
//         }
//         return true;
//     });

//     const versionsToDelete = includePatterns.length > 0 ? versionsWithoutExclude.filter((version) => {
//         const tags = version.metadata.container.tags;

//         if (tags.length === 0 && version.name.startsWith('sha256:')) return true;

//         return tags.some(tag => includePatterns.some(pattern => this.wildcardMatcher.match(tag, pattern)));
//     }) : versionsWithoutExclude;

//     const customPackage = {
//         id: pkg.id,
//         name: pkg.name,
//         type: pkg.package_type
//     };

//     return { package: customPackage, versions: versionsToDelete };

// }).filter(item => item !== null && item.versions.length > 0);

/***/ }),

/***/ 241:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(647);
const WildcardMatcher = __nccwpck_require__(220);
const AbstractPackageStrategy = __nccwpck_require__(313);

class MavenStrategy extends AbstractPackageStrategy {
    constructor() {
        super();
        this.name = 'Maven Strategy';
    }

    async execute({ packagesWithVersions, excludedPatterns, includedPatterns, thresholdDate, debug = false }) {

        // includedTags = ['*SNAPSHOT*', ...includedTags];
        const wildcardMatcher = new WildcardMatcher();

        // Filter packages with versions based on the threshold date and patterns
        let filteredPackagesWithVersionsForDelete = packagesWithVersions.map(({ package: pkg, versions }) => {

            if (versions.length === 1) return core.info(`Skipping package: ${pkg.name} — only one version.`), null;

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

            // Sort versions by creation date in descending order
            versionForDelete.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

            // Remove the most recent version (the first one after sorting)
            if (versionForDelete.length > 1) {
                versionForDelete = versionForDelete.slice(1);
            }

            let customPackage = {
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

/***/ 626:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const MavenStrategy = __nccwpck_require__(241);
const ContainerStrategy = __nccwpck_require__(109);

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

/***/ 220:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const escapeStringRegexp = __nccwpck_require__(855);

class WildcardMatcher {
  constructor() {
    this.name = 'WildcardMatcher';
  }

  match(tag, pattern) {
    const t = tag.toLowerCase();
    const p = pattern.toLowerCase();
    // Специальный кейс для 'semver' -- ищем строки вида '1.2.3', 'v1.2.3', '1.2.3-alpha', 'v1.2.3-fix'
    let regexPattern;
    if (p === 'semver') {
      regexPattern = '^[v]?\d+\.\d+\.\d+[-]?.*';
      const re = new RegExp(regexPattern, 'i');
      return re.test(t);
    }
    // специальный кейс для '?*' — только буквы+цифры и хотя бы одна цифра
    if (p === '?*') {
      // /^[a-z0-9]+$/ соответствует только алфа‑цифре
      // /\d/ проверяет, что есть хотя бы одна цифра
      return /^[a-z0-9]+$/.test(t) && /\d/.test(t);
    }

    // нет ни звёздочки, ни вопроса — строгое сравнение
    if (!p.includes('*') && !p.includes('?')) {
      return t === p;
    }

    // чистый префикс: xxx*
    if (p.endsWith('*') && !p.startsWith('*') && !p.includes('?')) {
      return t.startsWith(p.slice(0, -1));
    }

    // чистый суффикс: *xxx
    if (p.startsWith('*') && !p.endsWith('*') && !p.includes('?')) {
      return t.endsWith(p.slice(1));
    }

    // contains: *xxx*
    if (p.startsWith('*') && p.endsWith('*') && !p.includes('?')) {
      return t.includes(p.slice(1, -1));
    }

    // общий вариант: билдим RegExp, эскейпим спецсимволы, затем *→.* и ?→.
    const escaped = '^' + escapeStringRegexp(p)
      // превращаем джокеры в RegExp
      .replace(/\\\*/g, '.*')
      .replace(/\\\?/g, '.');

    const re = new RegExp(`^${escaped}$`, 'i');
    return re.test(t);
  }
}

module.exports = WildcardMatcher;


/***/ }),

/***/ 899:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const github = __nccwpck_require__(947);
const { exec } = __nccwpck_require__(317);
const util = __nccwpck_require__(23);
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
      return response.data.type !== 'User' ? true : false;
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
          package_type: 'container',
          per_page: 100,      // максимум 100 пакетов за запрос
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
          per_page: 100,      // максимум 100 пакетов за запрос
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
 * Возвращает массив digest’ов из manifest-list для заданного тега.
 *
 * @param {string} owner — организация или пользователь
 * @param {string} packageName — имя контейнерного пакета
 * @param {string} tag — тег образа
 * @returns {Promise<string[]>} — список digest’ов для всех платформ
 */
  async getManifestDigests(owner, packageName, tag) {
    const ref = `ghcr.io/${owner}/${packageName}:${tag}`;
    // запуским docker manifest inspect и распарсим JSON
    const { stdout } = await execPromise(`docker manifest inspect ${ref}`);
    const manifest = JSON.parse(stdout);
    // вернём digest из каждого entry в manifests
    return manifest.manifests.map(m => m.digest);
  }

}

module.exports = OctokitWrapper;

/***/ }),

/***/ 647:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 947:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 855:
/***/ ((module) => {

module.exports = eval("require")("escape-string-regexp");


/***/ }),

/***/ 317:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 23:
/***/ ((module) => {

"use strict";
module.exports = require("util");

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
// With a motherfucking microphone, plug it in my soul
// I'm a renegade riot getting out of control
// I'm-a keeping it alive and continue to be
// Flying like an eagle to my destiny

const core = __nccwpck_require__(647);
const OctokitWrapper = __nccwpck_require__(899);
const ContainerReport = __nccwpck_require__(667);
const MavenReport = __nccwpck_require__(28);
const { getStrategy } = __nccwpck_require__(626);

async function run() {

  // const configurationPath = core.getInput('config-file-path');

  // if (configurationPath === "") {
  //   core.info("❗️ Configuration file path is empty. Try to using default path: ./.github/package-cleanup-config.yml");
  //   configurationPath = "./.github/package-cleanup-config.yml";
  // }

  const isDebug = core.getInput("debug").toLowerCase() === "true";
  const dryRun = core.getInput("dry-run").toLowerCase() === "true";

  const package_type = core.getInput("package-type").toLowerCase();

  core.info(`Is debug? -> ${isDebug}`);
  core.info(`Dry run? -> ${dryRun}`);

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

  // core.info(`Configuration Path: ${configurationPath}`);
  core.info(`Threshold Days: ${thresholdDays}`);
  core.info(`Threshold Date: ${thresholdDate}`);

  excludedTags.length && core.info(`Excluded Tags: ${excludedTags}`);
  includedTags.length && core.info(`Included Tags: ${includedTags}`);

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  const wrapper = new OctokitWrapper(process.env.PACKAGE_TOKEN);

  const isOrganization = await wrapper.isOrganization(owner);
  core.info(`Is Organization? -> ${isOrganization}`);

  // strategy will start  here for different types of packages
  core.info(`Package type: ${package_type}, owner: ${owner}, repo: ${repo}`);

  // let packages = await wrapper.listPackages(owner, 'container', isOrganization);

  let packages = await wrapper.listPackages(owner, package_type, isOrganization);

  let filteredPackages = packages.filter((pkg) => pkg.repository?.name === repo);
  // core.info(`Filtered Packages: ${JSON.stringify(filteredPackages, null, 2)}`);


  core.info(`Found ${packages.length} packages of type '${package_type}' for owner '${owner}'`);

  if (packages.length === 0) {
    core.info("❗️ No packages found.");
    return;
  }

  const packagesWithVersions = await Promise.all(
    filteredPackages.map(async (pkg) => {
      const versionsForPkg = await wrapper.listVersionsForPackage(owner, pkg.package_type, pkg.name, isOrganization);
      return { package: pkg, versions: versionsForPkg };
    })
  );

  //core.info(JSON.stringify(packagesWithVersions, null, 2));

  const strategyContext = {
    packagesWithVersions: packagesWithVersions,
    excludedPatterns: excludedTags,
    includedPatterns: includedTags,
    thresholdDate,
    wrapper,
    owner,
    isOrganization,
    debug: isDebug
  };


  let strategy = getStrategy(package_type);
  // // let strategy = package_type === 'container' ? new ContainerStrategy() : new MavenStrategy();

  console.log(`Using strategy -> ${await strategy.toString()}`);

  let filteredPackagesWithVersionsForDelete = await strategy.execute(strategyContext);
  // core.info(`Filtered Packages with Versions for Delete: ${JSON.stringify(filteredPackagesWithVersionsForDelete, null, 2)}`);

  if (isDebug) {

    core.info(`::group::Delete versions Log.`);
    core.info(`💡 Package with version for delete: ${JSON.stringify(filteredPackagesWithVersionsForDelete, null, 2)}`);
    core.info(`::endgroup::`);
  }

  let reportContext = {
    filteredPackagesWithVersionsForDelete,
    thresholdDays,
    thresholdDate,
    dryRun,
    includedTags,
    excludedTags
  };

  if (dryRun) {
    core.warning("Dry run mode enabled. No versions will be deleted.");
    await showReport(reportContext, package_type);
    return;
  }

  for (const { package: pkg, versions } of filteredPackagesWithVersionsForDelete) {
    for (const version of versions) {
      try {
        let detail = pkg.type === 'maven' ? version.name : (version.metadata?.container?.tags ?? []).join(', ');
        core.info(`Package: ${pkg.name} (${pkg.type}) — deleting version: ${version.id} (${detail})`);
        await wrapper.deletePackageVersion(owner, pkg.type, pkg.name, version.id, isOrganization);
      } catch (error) {
        if (error.message.includes("Publicly visible package versions with more than 5000 downloads cannot be deleted")) {
          core.warning(`Skipping version: ${version.id} (${version.metadata?.container?.tags?.join(', ')}) due to high download count.`);
        } else {
          core.error(`Failed to delete version: ${version.id} (${version.metadata?.container?.tags?.join(', ')}) — ${error.message}`);
        }
      }
    }
  }

  await showReport(reportContext, package_type);
  core.info("✅ Action completed.");
}

async function showReport(context, type = 'container') {
  let report = type === 'container' ? new ContainerReport() : new MavenReport();
  await report.writeSummary(context);

}

run();

module.exports = __webpack_exports__;
/******/ })()
;
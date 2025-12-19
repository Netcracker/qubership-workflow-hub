const core = require('@actions/core');
const AbstractPackageStrategy = require("./abstractPackageStrategy");
const WildcardMatcher = require("../utils/wildcardMatcher");
const log = require("@netcracker/action-logger");

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
        log.info(`Executing ContainerStrategy on ${Array.isArray(packagesWithVersions) ? packagesWithVersions.length : 'unknown'} packages.`);
        log.setDebug(debug);

        const excluded = excludedPatterns.map(p => p.toLowerCase());
        const included = includedPatterns.map(p => p.toLowerCase());
        const packages = await this.parse(packagesWithVersions);
        const result = [];

        const ownerLC = typeof owner === 'string' ? owner.toLowerCase() : owner;

        for (const pkg of packages) {
            log.debug(` [${pkg.name}] Total versions: ${pkg.versions.length}`);

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
            if (protectedTags.size > 0) {
                log.debug(` [${pkg.name}] Protected tags: ${Array.from(protectedTags).join(', ')}`);
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
                    log.warn(`Failed to fetch manifest for ${pkg.name}:${tag} — ${e.message}`);
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
            log.debug(` [${pkg.name}] After date & exclude filter: ${withoutExclude.length} versions`);

            // Show versions with their tags for debugging
            if (withoutExclude.length > 0 && withoutExclude.length <= 10) {
                withoutExclude.forEach(v => {
                    const tagsStr = v.metadata.container.tags.length > 0
                        ? v.metadata.container.tags.join(', ')
                        : '<no tags>';
                    log.debug(`   - ${v.name.substring(0, 20)}... tags: [${tagsStr}]`);
                });
            }

            // 2) Selecting tagged versions by includePatterns
            const taggedToDelete = included.length > 0
                ? withoutExclude.filter(v =>
                    v.metadata.container.tags
                        .map(t => t.toLowerCase())
                        .some(t => included.some(pat => this.wildcardMatcher.match(t, pat)))
                )
                : withoutExclude.filter(v => v.metadata.container.tags.length > 0);

            if (included.length > 0) {
                log.debug(` [${pkg.name}] Include patterns: ${included.join(', ')}`);
            }

            if (taggedToDelete.length > 0) {
                const preview = taggedToDelete.map(v => v.name).join(', ');
                log.debug(` [${pkg.name}] taggedToDelete (${taggedToDelete.length}): ${preview}`);
            } else {
                log.debug(` [${pkg.name}] taggedToDelete: none`);
            }

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
                        log.warn(`Failed to fetch manifest ${pkg.name}:${tag} — ${e.message}`);
                    }
                }
                digestMap.set(v.name, digs);
            }

            // 4) Arch layers: from withoutExclude
            const archLayers = withoutExclude.filter(v =>
                v.metadata.container.tags.length === 0 &&
                Array.from(digestMap.values()).some(digs => digs.has(v.name))
            );
            if (archLayers.length > 0) {
                const preview = archLayers.map(v => v.name).join(', ');
                log.debug(` [${pkg.name}] archLayers (${archLayers.length}): ${preview}`);
            } else {
                log.debug(` [${pkg.name}] archLayers: none`);
            }

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
            if (debug) {
                if (danglingLayers.length > 0) {
                    const preview = danglingLayers.map(v => v.name).join(', ');
                    log.debug(`[${pkg.name}] danglingLayers (${danglingLayers.length}): ${preview}`);
                } else {
                    log.debug(`[${pkg.name}] danglingLayers: none`);
                }
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
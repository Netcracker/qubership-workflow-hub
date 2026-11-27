import AbstractPackageStrategy from "./abstractPackageStrategy.js";
import WildcardMatcher from "../utils/wildcardMatcher.js";
import log from "@qubership/action-logger";

const MODULE = 'container.js';

// Max parallel `docker manifest inspect` calls, so protecting every retained image
// does not spawn hundreds of docker processes or hit registry rate limits.
const MANIFEST_CONCURRENCY = 8;

function createLimiter(max) {
    let active = 0;
    const queue = [];
    const next = () => {
        if (active >= max || queue.length === 0) return;
        active++;
        const { fn, resolve, reject } = queue.shift();
        Promise.resolve().then(fn).then(resolve, reject).finally(() => {
            active--;
            next();
        });
    };
    return (fn) => new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        next();
    });
}

function collectDigests(target, ds) {
    if (Array.isArray(ds)) ds.forEach(d => { target.add(d) });
    else if (ds) target.add(ds);
}

// GitHub returns created_at as a full ISO 8601 timestamp with a time zone, e.g. 2025-01-31T12:00:00Z.
const ISO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// Creation time in milliseconds, or NaN when the date is missing or invalid.
// new Date() alone is too lenient: it turns false, 0 and null into the 1970 epoch, moves 2024-02-30 to
// 1 March and reads a string without a time zone in the local zone. So the value must be a string in the
// format above with a real calendar date and time (or a valid Date object).
function creationTime(createdAt) {
    if (createdAt instanceof Date) return createdAt.getTime();
    if (typeof createdAt !== 'string') return NaN;
    const match = ISO_TIMESTAMP.exec(createdAt);
    if (!match) return NaN;
    const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
    if (month < 1 || month > 12) return NaN;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59) return NaN;
    return new Date(createdAt).getTime();
}

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
            // Do not swallow the error: the caller must not continue with undefined data
            throw new Error(`Failed to parse packages: ${err.message}`, { cause: err });
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
      * @param {Array<{ package: string, failedTags: Array<{ tag: string, reason: string }> }>} [params.incompleteCleanup]
      *   Collector: packages where untagged versions were deliberately not deleted because
      *   the manifest of a retained image could not be inspected.
      * @returns {Promise<Array<{ package: Object, versions: Array }>>}
      */
    async execute({ packagesWithVersions, excludedPatterns = [], includedPatterns = [], thresholdDate, wrapper, owner, debug = false, incompleteCleanup = [] }) {
        log.info(`Executing ContainerStrategy on ${Array.isArray(packagesWithVersions) ? packagesWithVersions.length : 'unknown'} packages.`);
        log.setDebug(debug);

        if (!(thresholdDate instanceof Date) || Number.isNaN(thresholdDate.getTime())) {
            throw new Error(`Invalid threshold date: ${thresholdDate}`);
        }

        const thresholdTime = thresholdDate.getTime();
        const limit = createLimiter(MANIFEST_CONCURRENCY);

        const excluded = excludedPatterns.map(p => p.toLowerCase());
        const included = includedPatterns.map(p => p.toLowerCase());
        const packages = await this.parse(packagesWithVersions);

        const ownerLC = typeof owner === 'string' ? owner.toLowerCase() : owner;

        const packagePromises = packages.map(async (pkg) => {
            log.debug(`[${pkg.name}] Total versions: ${pkg.versions.length}`, MODULE);

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
                log.debug(` [${pkg.name}] Protected tags: ${Array.from(protectedTags).join(', ')}`, MODULE);
            }

            const imageLC = pkg.name.toLowerCase();

            // 1) Basic filtering by date and excludedPatterns for tagged/orphan
            // A version without a valid creation date cannot be judged by age: it is always kept.
            const invalidDateIds = [];
            const withoutExclude = pkg.versions.filter(v => {
                const created = creationTime(v.createdAt);
                if (Number.isNaN(created)) {
                    invalidDateIds.push(v.id);
                    return false;
                }
                if (created > thresholdTime) return false;
                const tags = v.metadata.container.tags.map(t => t.toLowerCase());
                if (tags.includes('latest')) return false;
                if (excluded.some(pat => tags.some(t => this.wildcardMatcher.match(t, pat)))) {
                    return false;
                }
                return true;
            });
            if (invalidDateIds.length > 0) {
                const shown = invalidDateIds.slice(0, 10).join(', ');
                const more = invalidDateIds.length > 10 ? `, ... (${invalidDateIds.length - 10} more)` : '';
                log.warn(`[${pkg.name}] ${invalidDateIds.length} version(s) have a missing or invalid creation date and are kept (ids: ${shown}${more})`);
            }
            log.debug(` [${pkg.name}] After date & exclude filter: ${withoutExclude.length} versions`, MODULE);

            // Show versions with their tags for debugging
            if (withoutExclude.length > 0 && withoutExclude.length <= 10) {
                withoutExclude.forEach(v => {
                    const tagsStr = v.metadata.container.tags.length > 0
                        ? v.metadata.container.tags.join(', ')
                        : '<no tags>';
                    log.debug(`   - ${v.name.substring(0, 20)}... tags: [${tagsStr}]`, MODULE);
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
                log.debug(` [${pkg.name}] Include patterns: ${included.join(', ')}`, MODULE);
            }

            if (taggedToDelete.length > 0) {
                const preview = taggedToDelete.map(v => v.name).join(', ');
                log.debug(` [${pkg.name}] taggedToDelete (${taggedToDelete.length}): ${preview}`, MODULE);
            } else {
                log.debug(` [${pkg.name}] taggedToDelete: none`, MODULE);
            }

            // 2.1) Retained images: every tagged version that is NOT going to be deleted
            // (fresh, latest, excluded, or not matched by includePatterns).
            // Their referenced manifests (platform/attestation versions) must never be deleted.
            const toDeleteNames = new Set(taggedToDelete.map(v => v.name));
            const retainedTags = new Set();
            for (const v of pkg.versions) {
                if (v.metadata.container.tags.length > 0 && !toDeleteNames.has(v.name)) {
                    v.metadata.container.tags.forEach(tag => { retainedTags.add(tag) });
                }
            }

            // Digests only decide which untagged versions (layers or dangling) may be deleted.
            // Without untagged versions in the package there is nothing to decide, so skip the inspections.
            const hasUntagged = pkg.versions.some(v => v.metadata.container.tags.length === 0);
            if (!hasUntagged) {
                log.debug(` [${pkg.name}] No untagged versions: manifest inspection skipped`, MODULE);
            }

            const protectedDigests = new Set();
            const failedRetainedTags = [];
            await Promise.all((hasUntagged ? Array.from(retainedTags) : []).map(async (tag) => {
                try {
                    const ds = await limit(() => wrapper.getManifestDigests(ownerLC, imageLC, tag));
                    collectDigests(protectedDigests, ds);
                } catch (e) {
                    log.warn(`Failed to fetch manifest for ${pkg.name}:${tag} — ${e.message}`);
                    failedRetainedTags.push({ tag, reason: e.message });
                }
            }));

            // If the manifest of a retained image is unknown, we cannot tell which untagged
            // versions it references: do not delete any untagged version of this package.
            const untaggedDeletionSafe = failedRetainedTags.length === 0;
            if (!untaggedDeletionSafe) {
                log.warn(`[${pkg.name}] Could not inspect ${failedRetainedTags.length} retained tag(s): ${failedRetainedTags.map(f => f.tag).join(', ')}. Untagged versions of this package will NOT be deleted.`);
                incompleteCleanup.push({ package: pkg.name, failedTags: failedRetainedTags });
            }

            // 3) Gathering manifest digests for each tagged.
            // When untagged deletion is already blocked, the digests would not be used: skip the candidates.
            const digestMap = new Map();
            const candidatesToInspect = hasUntagged && untaggedDeletionSafe ? taggedToDelete : [];
            const digestPromises = candidatesToInspect.map(async (v) => {
                const tagPromises = v.metadata.container.tags.map(async (tag) => {
                    try {
                        const ds = await limit(() => wrapper.getManifestDigests(ownerLC, imageLC, tag));
                        return { success: true, digests: ds };
                    } catch (e) {
                        log.warn(`Failed to fetch manifest ${pkg.name}:${tag} — ${e.message}`);
                        return { success: false };
                    }
                });
                const results = await Promise.all(tagPromises);
                const digs = new Set();
                for (const result of results) {
                    if (result.success) collectDigests(digs, result.digests);
                }
                // A failed read of any tag leaves the layers of this image uncertain
                return { versionName: v.name, versionId: v.id, digests: digs, complete: results.every(r => r.success) };
            });
            const digestResults = await Promise.all(digestPromises);
            const unresolvedCandidates = [];
            for (const result of digestResults) {
                digestMap.set(result.versionName, result.digests);
                if (!result.complete) unresolvedCandidates.push(result.versionId);
            }
            if (unresolvedCandidates.length > 0) {
                log.warn(`[${pkg.name}] The manifest of ${unresolvedCandidates.length} image(s) selected for deletion could not be fully read. Untagged versions of this package are deleted only after these images were deleted.`);
            }

            // All digests referenced by the tagged candidates: one lookup instead of scanning digestMap per version
            const allDigests = new Set();
            for (const digs of digestMap.values()) {
                for (const d of digs) allDigests.add(d);
            }

            // 4) Arch layers: from withoutExclude, but not used by protected versions
            const archLayers = !untaggedDeletionSafe ? [] : withoutExclude.filter(v =>
                v.metadata.container.tags.length === 0 &&
                allDigests.has(v.name) &&
                !protectedDigests.has(v.name)
            );
            if (archLayers.length > 0) {
                const preview = archLayers.map(v => v.name).join(', ');
                log.debug(` [${pkg.name}] archLayers (${archLayers.length}): ${preview}`, MODULE);
            } else {
                log.debug(` [${pkg.name}] archLayers: none`, MODULE);
            }

            // 5) Sorting tagged + their archLayers.
            // A layer goes right after the FIRST tagged version (taggedToDelete order) that references it,
            // layers of one version keep the archLayers order, and a repeated layer name is taken once.
            // The ids of ALL candidate images that reference a layer are kept in dependsOn: the layer may be
            // deleted only after every one of them was deleted.
            const firstOwner = new Map();
            const ownerIdsOf = new Map();
            taggedToDelete.forEach((v, index) => {
                for (const digest of digestMap.get(v.name) || []) {
                    if (!firstOwner.has(digest)) firstOwner.set(digest, index);
                    const ids = ownerIdsOf.get(digest);
                    if (ids) ids.push(v.id);
                    else ownerIdsOf.set(digest, [v.id]);
                }
            });
            const layersOf = taggedToDelete.map(() => []);
            const used = new Set();
            for (const layer of archLayers) {
                const owner = firstOwner.get(layer.name);
                if (owner !== undefined && !used.has(layer.name)) {
                    layersOf[owner].push({ ...layer, dependsOn: ownerIdsOf.get(layer.name) });
                    used.add(layer.name);
                }
            }
            const ordered = [];
            taggedToDelete.forEach((v, index) => {
                ordered.push(v);
                // push one by one: spreading a huge array into push() exceeds the engine's argument limit
                for (const layer of layersOf[index]) ordered.push(layer);
            });
            const orderedNames = new Set(ordered.map(o => o.name));

            // 6) Dangling: only by date, without tags, not in ordered and not in protectedDigests
            const danglingLayers = !untaggedDeletionSafe ? [] : pkg.versions.filter(v =>
                creationTime(v.createdAt) <= thresholdTime &&
                v.metadata.container.tags.length === 0 &&
                !allDigests.has(v.name) &&
                !protectedDigests.has(v.name) &&
                !orderedNames.has(v.name)
            );
            if (debug) {
                if (danglingLayers.length > 0) {
                    const preview = danglingLayers.map(v => v.name).join(', ');
                    log.debug(`[${pkg.name}] danglingLayers (${danglingLayers.length}): ${preview}`, MODULE);
                } else {
                    log.debug(`[${pkg.name}] danglingLayers: none`, MODULE);
                }
            }

            const toDelete = [...ordered, ...danglingLayers];
            if (toDelete.length > 0) {
                return {
                    package: { id: pkg.id, name: pkg.name, type: pkg.packageType },
                    versions: toDelete,
                    // images whose manifest could not be fully read: every untagged version waits for them (set once per package)
                    ...(unresolvedCandidates.length > 0 ? { unresolvedCandidates } : {})
                };
            }
            return null;
        });

        const packageResults = await Promise.all(packagePromises);
        const result = packageResults.filter(r => r !== null);

        return result;
    }

    isValidMetadata(version) {
        return Array.isArray(version?.metadata?.container?.tags);
    }

    toString() {
        return this.name;
    }
}

export default ContainerStrategy;
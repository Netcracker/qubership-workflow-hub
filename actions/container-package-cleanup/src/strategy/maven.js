const core = require('@actions/core');
const WildcardMatcher = require("../utils/wildcardMatcher");
const AbstractPackageStrategy = require("./abstractPackageStrategy");

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

                debug && core.info(`No versions found for package: ${pcdkg.name} that match the criteria.`);
                return null;
            }

            // Sort versions by creation date in descending order
            versionForDelete.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
// Default inclusion for Maven when no include filter is given: only SNAPSHOT versions are cleaned up.
const MAVEN_DEFAULT_INCLUDE = "*SNAPSHOT*";

const unique = (list) => [...new Set(list)];

/**
 * Merges the tag and pattern inputs into one include list and one exclude list.
 * Exclusions always win over inclusions (the strategies check them first).
 *
 * @param {string} packageType - "container" | "maven"
 * @param {{ includedTags?: string[], includedPatterns?: string[], excludedTags?: string[], excludedPatterns?: string[] }} lists
 * @returns {{ included: string[], excluded: string[] }}
 */
function resolveFilters(packageType, { includedTags = [], includedPatterns = [], excludedTags = [], excludedPatterns = [] } = {}) {
  const excluded = unique([...excludedTags, ...excludedPatterns]);
  let included = unique([...includedTags, ...includedPatterns]);
  // Maven: SNAPSHOT is the default only when no explicit inclusion is given
  if (packageType === "maven" && included.length === 0) included = [MAVEN_DEFAULT_INCLUDE];
  return { included, excluded };
}

export { resolveFilters, MAVEN_DEFAULT_INCLUDE };

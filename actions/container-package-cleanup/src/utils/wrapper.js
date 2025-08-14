const github = require("@actions/github");
const { exec } = require("child_process");
const util = require("util");
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
const github = require("@actions/github");
const OctokitWrapper = require("../src/wrapper");

jest.mock("@actions/github");

describe("OctokitWrapper", () => {
  let wrapper;
  let mockOctokit;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        users: {
          getByUsername: jest.fn(),
        },
        packages: {
          listPackagesForOrganization: jest.fn(),
          listPackagesForUser: jest.fn(),
          getAllPackageVersionsForPackageOwnedByUser: jest.fn(),
          getAllPackageVersionsForPackageOwnedByOrg: jest.fn(),
          deletePackageVersionForOrg: jest.fn(),
          deletePackageVersionForUser: jest.fn(),
        },
      },
    };
    github.getOctokit.mockReturnValue(mockOctokit);
    wrapper = new OctokitWrapper("fake-token");
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test("should determine if a username belongs to an organization", async () => {
    mockOctokit.rest.users.getByUsername.mockResolvedValue({ data: { type: "Organization" } });

    const result = await wrapper.isOrganization("test-org");

    expect(result).toBe(true);
    expect(mockOctokit.rest.users.getByUsername).toHaveBeenCalledWith({ username: "test-org" });
  });

  test("should determine if a username does not belong to an organization", async () => {
    mockOctokit.rest.users.getByUsername.mockResolvedValue({ data: { type: "User" } });

    const result = await wrapper.isOrganization("test-user");

    expect(result).toBe(false);
    expect(mockOctokit.rest.users.getByUsername).toHaveBeenCalledWith({ username: "test-user" });
  });

  test("should list packages for an organization", async () => {
    mockOctokit.rest.packages.listPackagesForOrganization.mockResolvedValue({ data: ["package1", "package2"] });

    const result = await wrapper.listPackagesForOrganization("test-org", "container");

    expect(result).toEqual(["package1", "package2"]);
    expect(mockOctokit.rest.packages.listPackagesForOrganization).toHaveBeenCalledWith({
      org: "test-org",
      package_type: "container",
    });
  });

  test("should list packages for a user", async () => {
    mockOctokit.rest.packages.listPackagesForUser.mockResolvedValue({ data: ["package1", "package2"] });

    const result = await wrapper.listPackagesForUser("test-user", "container");

    expect(result).toEqual(["package1", "package2"]);
    expect(mockOctokit.rest.packages.listPackagesForUser).toHaveBeenCalledWith({
      username: "test-user",
      package_type: "container",
    });
  });

  test("should list versions for a package owned by a user", async () => {
    mockOctokit.rest.packages.getAllPackageVersionsForPackageOwnedByUser.mockResolvedValue({
      data: ["version1", "version2"],
    });

    const result = await wrapper.getPackageVersionsForUser("test-user", "container", "test-package");

    expect(result).toEqual(["version1", "version2"]);
    expect(mockOctokit.rest.packages.getAllPackageVersionsForPackageOwnedByUser).toHaveBeenCalledWith({
      package_type: "container",
      package_name: "test-package",
      username: "test-user",
    });
  });

  test("should list versions for a package owned by an organization", async () => {
    mockOctokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg.mockResolvedValue({
      data: ["version1", "version2"],
    });

    const result = await wrapper.getPackageVersionsForOrganization("test-org", "container", "test-package");

    expect(result).toEqual(["version1", "version2"]);
    expect(mockOctokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg).toHaveBeenCalledWith({
      package_type: "container",
      package_name: "test-package",
      org: "test-org",
    });
  });

  test("should delete a package version for a user", async () => {
    await wrapper.deletePackageVersion("test-user", "container", "test-package", "123", false);

    expect(mockOctokit.rest.packages.deletePackageVersionForUser).toHaveBeenCalledWith({
      package_type: "container",
      package_name: "test-package",
      package_version_id: "123",
      username: "test-user",
    });
  });

  test("should delete a package version for an organization", async () => {
    await wrapper.deletePackageVersion("test-org", "container", "test-package", "123", true);

    expect(mockOctokit.rest.packages.deletePackageVersionForOrg).toHaveBeenCalledWith({
      package_type: "container",
      package_name: "test-package",
      package_version_id: "123",
      org: "test-org",
    });
  });

  test("should throw an error if fetching user fails", async () => {
    mockOctokit.rest.users.getByUsername.mockRejectedValue(new Error("User not found"));

    await expect(wrapper.isOrganization("nonexistent-user")).rejects.toThrow("User not found");
  });
});
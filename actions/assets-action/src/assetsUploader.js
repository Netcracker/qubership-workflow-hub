const { execSync } = require("child_process");
const path = require("path");
const core = require("@actions/core");

class AssetUploader {
    constructor(token, releaseTag, owner, repo) {
        this.token = token;
        this.releaseTag = releaseTag;
        this.owner = owner;
        this.repo = repo;
    }

    async toString() {
        return `AssetUploader: { owner: ${this.owner}, repo: ${this.repo}, releaseTag: ${this.releaseTag} }`;
    }

    async upload(assetPath) {
        if (!this.owner || !this.repo || !this.releaseTag) {
            throw new Error(`❗️ Incorrect initialization of AssetUploader: { owner: ${this.owner}, repo: ${this.repo}, releaseTag: ${this.releaseTag} }`);
        }

        const fileName = path.basename(assetPath);
        const absPath = path.resolve(assetPath);
        const repoArg = `${this.owner}/${this.repo}`;

        try {
            const cmd = [
                "gh", "release", "upload",
                this.releaseTag,
                `"${absPath}"`,
                "--repo", repoArg,
                "--clobber"
            ].join(" ");

            core.info(`Try Uploading asset: ${fileName} to release: ${this.releaseTag} in repo: ${repoArg}`);
            execSync(cmd, { stdio: "inherit", env: process.env });
            core.info(`✔️ Asset uploaded successfully: ${fileName} \n`);
        } catch (err) {
            throw err;
        }
    }
}

module.exports = AssetUploader;
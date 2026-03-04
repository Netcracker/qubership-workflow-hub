import { execSync } from "node:child_process";
import path from "node:path";
import * as core from "@actions/core";

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
        process.env.GH_TOKEN = this.token;
        if (!this.owner || !this.repo || !this.releaseTag) {
            throw new Error(`❗️ Incorrect initialization of AssetUploader: { owner: ${this.owner}, repo: ${this.repo}, releaseTag: ${this.releaseTag} }`);
        }

        const fileName = path.basename(assetPath);
        const absPath = path.resolve(assetPath);
        const repoArg = `${this.owner}/${this.repo}`;

        const cmd = [
            "gh", "release", "upload",
            this.releaseTag,
            `"${absPath}"`,
            "--repo", repoArg,
            "--clobber",
        ].join(" ");

        core.info(`Try Uploading asset: ${fileName} to release: ${this.releaseTag} in repo: ${repoArg}`);
        execSync(cmd, { stdio: "inherit", env: process.env });
        core.info(`✔️ Asset uploaded successfully: ${fileName} \n`);
    }
}

export default AssetUploader;
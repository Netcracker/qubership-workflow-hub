import * as core from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";


async function addToArchive(itemPath, archiveType, compressionLevel) {

    const stat = await fs.promises.stat(itemPath);
    if (!stat.isDirectory()) {
        return itemPath;
    }

    const archiveName = `${path.basename(itemPath)}.${archiveType}`;
    const archivePath = path.join(path.dirname(itemPath), archiveName);

    const output = fs.createWriteStream(archivePath);
    const archive = archiver(archiveType, { zlib: { level: compressionLevel } });

    const archiveClosed = new Promise((resolve, reject) => {
        output.on("close", () => {
            core.info(`Archive created: ${archivePath}`);
            resolve();
        });
        archive.on("error", (err) => {
            reject(new Error(`Archive error: ${err.message}`));
        });
    });

    archive.pipe(output);
    archive.directory(itemPath, false);

    await archive.finalize();
    await archiveClosed;

    return archivePath;
}

async function createDir(name) {
    const dirPath = path.join(process.cwd(), name);
    try {
        await fs.promises.mkdir(dirPath, { recursive: true });
        core.info(`Directory created: ${dirPath}`);
    } catch (error) {
        throw new Error(`Failed to create directory: ${error.message}`);
    }
    return dirPath;
}

export { addToArchive, createDir };
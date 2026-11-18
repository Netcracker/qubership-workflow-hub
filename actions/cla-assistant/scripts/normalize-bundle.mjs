import { readFile, writeFile } from "node:fs/promises";

const bundle = new URL("../dist/index.js", import.meta.url);
const source = await readFile(bundle, "utf8");
await writeFile(bundle, source.replace(/[ \t]+$/gm, ""));

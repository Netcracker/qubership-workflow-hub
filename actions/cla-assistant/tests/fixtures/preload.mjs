import process from "node:process";
import fs from "node:fs";
import path from "node:path";

const directory = process.env.CLA_TEST_DIR;
const api = fs.readFileSync(path.join(directory, "api-url"), "utf8").trim();
process.env.GITHUB_API_URL = api;
process.env.GITHUB_GRAPHQL_URL = api + "/graphql";
process.env.GITHUB_EVENT_PATH = path.join(directory, "event.json");
process.env.GITHUB_EVENT_NAME = "pull_request";
process.env.GITHUB_REPOSITORY = "test-owner/test-repo";
process.env.GITHUB_ACTOR = "alice";

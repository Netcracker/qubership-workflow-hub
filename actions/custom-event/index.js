const core = require("@actions/core");
const github = require("@actions/github");
const log = require("@netcracker/action-logger");

function parseClientPayload(input) {
  try {
    return JSON.parse(input);
  } catch (error) {
    log.fail(`❗ Failed to parse client_payload: ${error.message}`);
  }
}

async function run() {
  try {
    const eventType = core.getInput("event-type", { required: true });
    const clientPayloadInput = core.getInput("client-payload") || "{}";
    const clientPayload = parseClientPayload(clientPayloadInput);

    log.info(`Event name: ${eventType}`);
    log.info(`Client Payload: ${JSON.stringify(clientPayload)}`);

    const token = core.getInput("github-token", { required: true }) || process.env.GITHUB_TOKEN;
    if (!token) log.fail("❗ GitHub token is required");

    const octokit = github.getOctokit(token);
    const { owner: defaultOwner, repo: defaultRepo } = github.context.repo;
    const owner = core.getInput('owner') || defaultOwner;
    const repo = core.getInput('repo') || defaultRepo;

    const { status } = await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type: eventType,
      client_payload: clientPayload,
    });

    log.success(`✅ Custom event "${eventType}" triggered on ${owner}/${repo} with status: ${status}`);
    core.setOutput("status", status);
  } catch (error) {
    log.fail(`❗ Action failed with error: ${error.message}`);
  }
}

run();

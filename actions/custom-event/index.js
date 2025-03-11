const core = require("@actions/core");
const github = require("@actions/github");

function parseClientPayload(input) {
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid JSON for client_payload: ${input}`);
  }
}

async function run() {
  try {
    const eventType = core.getInput("event-type", { required: true });
    const clientPayloadInput = core.getInput("client-payload") || "{}";
    const clientPayload = parseClientPayload(clientPayloadInput);

    core.info(`Event name: ${eventType}`);
    core.info(`Client Payload: ${JSON.stringify(clientPayload)}`);

    const token =
      core.getInput("github-token", { required: true }) || process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GitHub token is not provided. Make sure it is passed.");
    }

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

    core.info(`Custom event "${eventType}" triggered with status: ${status}`);
    core.setOutput("status", status);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
    console.error(error);
  }
}

run();

const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const eventType = core.getInput("event_type", { required: true });
    const clientPayloadInput =
      core.getInput("client_payload", { required: false }) || "{}";

    let clientPayload;
    try {
      clientPayload = JSON.parse(clientPayloadInput);
    } catch (error) {
      throw new Error(`Invalid JSON for client_payload: ${clientPayloadInput}`);
    }

    core.info(`Event name: ${eventType}`);
    core.info(`Client Payload: ${JSON.stringify(clientPayload)}`);

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error(
        "GitHub token is not provided. Make sure it is passed as an environment variable.",
      );
    }

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    const response = await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type: eventType,
      client_payload: clientPayload,
    });

    core.setOutput("status", response.status);
    core.info(
      `Custom event "${eventType}" triggered with status: ${response.status}`,
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

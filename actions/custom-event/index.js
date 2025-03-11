const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const eventType = core.getInput("event-type", { required: true });
    const clientPayloadInput =
      core.getInput("client-payload", { required: false }) || "{}";

    let clientPayload;
    try {
      clientPayload = JSON.parse(clientPayloadInput);
    } catch (error) {
      throw new Error(`Invalid JSON for client_payload: ${clientPayloadInput}`);
    }

    core.info(`Event name: ${eventType}`);
    core.info(`Client Payload: ${JSON.stringify(clientPayload)}`);

    const token = core.getInput("github-token", { required: true }) || process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        "GitHub token is not provided. Make sure it is passed as an environment variable.",
      );
    }

    const octokit = github.getOctokit(token);
    //const { owner, repo } = github.context.repo;

    const owner =  core.getInput('owner') || github.context.repo.owner;
    const repo =  core.getInput('repo') || github.context.repo.repo;

    core.warning('before create dispath')
    const response = await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type: eventType,
      client_payload: clientPayload,
    });

    core.warning('after create dispath')

    core.setOutput("status", response.status);
    core.info(
      `Custom event "${eventType}" triggered with status: ${response.status}`,
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

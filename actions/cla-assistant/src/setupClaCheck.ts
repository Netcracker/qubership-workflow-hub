import * as core from '@actions/core'
import { context } from '@actions/github'
import { checkAllowList } from './checkAllowList.js'
import getCommitters from './graphql.js'
import {
  IClaFileContent,
  IClafileContentAndSha,
  ICommitterMap,
  ICommittersDetails,
  IReactedCommitterMap
} from './interfaces.js'
import {
  createFile,
  getFileContent,
  updateFile
} from './persistence/persistence.js'
import prCommentSetup from './pullrequest/pullRequestComment.js'
import { reRunLastWorkFlowIfRequired } from './pullRerunRunner.js'

export async function setupClaCheck() {
  let committerMap = getInitialCommittersMap()

  let committers = await getCommitters()
  committers = checkAllowList(committers)

  const { claFileContent, sha } = (await getCLAFileContentandSHA(
    committers,
    committerMap
  )) as IClafileContentAndSha

  committerMap = prepareCommiterMap(committers, claFileContent) as ICommitterMap

  try {
    const reactedCommitters = (await prCommentSetup(
      committerMap,
      committers
    )) as IReactedCommitterMap

    if (reactedCommitters?.newSigned.length) {
      /* pushing the recently signed  contributors to the CLA Json File */
      await updateFile(sha, claFileContent, reactedCommitters)
    }
    if (
      reactedCommitters?.allSignedFlag ||
      committerMap?.notSigned === undefined ||
      committerMap.notSigned.length === 0
    ) {
      core.info(`All contributors have signed the CLA 📝 ✅ `)
      return reRunLastWorkFlowIfRequired()
    } else {
      core.setFailed(
        `Committers of Pull Request number ${context.issue.number} have to sign the CLA 📝`
      )
    }
  } catch (err) {
    core.setFailed(`Could not update the JSON file: ${err.message}`)
  }
}

async function getCLAFileContentandSHA(
  committers: ICommittersDetails[],
  committerMap: ICommitterMap
): Promise<void | IClafileContentAndSha> {
  let result
  try {
    result = await getFileContent()
  } catch (error) {
    if (error.status === 404 || error.status === '404') {
      return createClaFileAndPRComment(committers, committerMap)
    } else {
      throw new Error(
        `Could not retrieve repository contents. Status: ${error.status || 'unknown'}`
      )
    }
  }
  const sha = result?.data?.sha
  const claFileContentString = Buffer.from(result.data.content, 'base64').toString()
  const claFileContent = JSON.parse(claFileContentString)
  return { claFileContent, sha }
}

async function createClaFileAndPRComment(
  committers: ICommittersDetails[],
  committerMap: ICommitterMap
): Promise<void> {
  committerMap.notSigned = committers
  committerMap.signed = []
  committers.map(committer => {
    if (!committer.id) {
      committerMap.unknown.push(committer)
    }
  })

  const initialContent = { signedContributors: [] }
  const initialContentString = JSON.stringify(initialContent, null, 3)
  const initialContentBinary =
    Buffer.from(initialContentString).toString('base64')

  await createFile(initialContentBinary).catch(error =>
    core.setFailed(
      `Error occurred when creating the signed contributors file: ${
        error.message || error
      }. Make sure the branch where signatures are stored is NOT protected.`
    )
  )
  await prCommentSetup(committerMap, committers)
  throw new Error(
    `Committers of pull request ${context.issue.number} have to sign the CLA`
  )
}

function prepareCommiterMap(
  committers: ICommittersDetails[],
  claFileContent: IClaFileContent | null
): ICommitterMap {
  const committerMap = getInitialCommittersMap()

  committerMap.notSigned = committers.filter(
    committer =>
      !claFileContent?.signedContributors.some(cla => committer.id === cla.id)
  )
  committerMap.signed = committers.filter(committer =>
    claFileContent?.signedContributors.some(cla => committer.id === cla.id)
  )
  committers.map(committer => {
    if (!committer.id) {
      committerMap.unknown.push(committer)
    }
  })
  return committerMap
}

const getInitialCommittersMap = (): ICommitterMap => ({
  signed: [],
  notSigned: [],
  unknown: []
})

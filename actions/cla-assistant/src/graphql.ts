import { octokit } from './octokit.js'
import { context } from '@actions/github'
import type { ICommittersDetails } from './interfaces.js'

interface IGraphQlUser {
  id: string
  databaseId: number
  login: string
}

interface IGraphQlCommit {
  author: { email: string; name: string; user: IGraphQlUser | null }
  committer: { name: string; user: IGraphQlUser | null }
}

interface IGraphQlEdge {
  node: { commit: IGraphQlCommit }
  cursor: string
}

interface IGraphQlResponse {
  repository: {
    pullRequest: {
      commits: {
        totalCount: number
        edges: IGraphQlEdge[]
        pageInfo: { endCursor: string; hasNextPage: boolean }
      }
    }
  }
}

export default async function getCommitters(): Promise<ICommittersDetails[]> {
  try {
    const committers: ICommittersDetails[] = []
    let filteredCommitters: ICommittersDetails[] = []
    let cursor = ''
    while (true) {
      const response = await octokit.graphql<IGraphQlResponse>(
        `
          query($owner:String! $name:String! $number:Int! $cursor:String!){
              repository(owner: $owner, name: $name) {
              pullRequest(number: $number) {
                  commits(first: 100, after: $cursor) {
                      totalCount
                      edges {
                          node {
                              commit {
                                  author {
                                      email
                                      name
                                      user {
                                          id
                                          databaseId
                                          login
                                      }
                                  }
                                  committer {
                                      name
                                      user {
                                          id
                                          databaseId
                                          login
                                      }
                                  }
                              }
                          }
                          cursor
                      }
                      pageInfo {
                          endCursor
                          hasNextPage
                      }
                  }
              }
          }
      }`.replace(/ /g, ''),
        {
          owner: context.repo.owner,
          name: context.repo.repo,
          number: context.issue.number,
          cursor
        }
      )
      response.repository.pullRequest.commits.edges.forEach(
        (edge: IGraphQlEdge) => {
          const committer = extractUserFromCommit(edge.node.commit)
          const user = {
            name: committer.login || committer.name,
            id: committer.databaseId || '',
            pullRequestNo: context.issue.number
          }
          if (
            committers.length === 0 ||
            committers
              .map(c => {
                return c.name
              })
              .indexOf(user.name) < 0
          ) {
            committers.push(user)
          }
        }
      )
      const page = response.repository.pullRequest.commits.pageInfo
      if (!page.hasNextPage) break
      if (!page.endCursor || page.endCursor === cursor) {
        throw new Error('Commit pagination did not advance')
      }
      cursor = page.endCursor
    }
    filteredCommitters = committers.filter(committer => {
      return committer.id !== 41898282
    })
    return filteredCommitters
  } catch (e) {
    throw new Error(`graphql call to get the committers details failed: ${e}`)
  }
}
const extractUserFromCommit = commit =>
  commit.author.user ||
  commit.committer.user ||
  commit.author ||
  commit.committer

import { octokit } from './octokit.js'
import { context } from '@actions/github'
import type { ICommittersDetails } from './interfaces.js'



export default async function getCommitters(): Promise<ICommittersDetails[]> {
    try {
        const committers: ICommittersDetails[] = []
        let filteredCommitters: ICommittersDetails[] = []
        const response = await octokit.graphql(`
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
    }`.replace(/ /g, ''), {
            owner: context.repo.owner,
            name: context.repo.repo,
            number: context.issue.number,
            cursor: ''
        })
        response.repository.pullRequest.commits.edges.forEach(edge => {
            const committer = extractUserFromCommit(edge.node.commit)
            const user = {
                name: committer.login || committer.name,
                id: committer.databaseId || '',
                pullRequestNo: context.issue.number
            }
            if (committers.length === 0 || committers.map((c) => {
                return c.name
            }).indexOf(user.name) < 0) {
                committers.push(user)
            }
        })
        filteredCommitters = committers.filter((committer) => {
            return committer.id !== 41898282
        })
        return filteredCommitters

    } catch (e) {
        throw new Error(`graphql call to get the committers details failed: ${e}`)
    }

}
const extractUserFromCommit = (commit) => commit.author.user || commit.committer.user || commit.author || commit.committer
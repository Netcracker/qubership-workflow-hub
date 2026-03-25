import { ICommittersDetails } from './interfaces.js'
import * as input from './shared/getInputs.js'

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isUserNotInAllowList(committer: string): boolean {
  const allowListPatterns: string[] = input.getAllowListItem().split(',')

  return allowListPatterns.filter(function (pattern) {
    pattern = pattern.trim()
    if (pattern.includes('*')) {
      const regex = escapeRegExp(pattern).split('\\*').join('.*')
      return new RegExp(regex).test(committer)
    }
    return pattern === committer
  }).length > 0
}

export function checkAllowList(committers: ICommittersDetails[]): ICommittersDetails[] {
  return committers.filter(committer => committer && !isUserNotInAllowList(committer.name))
}
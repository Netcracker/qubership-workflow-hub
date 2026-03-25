export interface ICommitterMap {
    signed: ICommittersDetails[],
    notSigned: ICommittersDetails[],
    unknown: ICommittersDetails[]
}
export interface IReactedCommitterMap {
    newSigned: ICommittersDetails[],
    onlyCommitters?: ICommittersDetails[],
    allSignedFlag: boolean
}
export interface ICommentedCommitterMap {
    newSigned: ICommittersDetails[],
    onlyCommitters?: ICommittersDetails[],
    allSignedFlag: boolean
}
export interface ICommittersDetails {
    name: string,
    id: number,
    pullRequestNo?: number,
    created_at?: string,
    updated_at?: string
    comment_id?: number,
    body?: string,
    repoId?: string
}
export interface ILabelName {
    current_name: string,
    name: string
}
export interface ICommittersCommentDetails {
    name: string,
    id: number,
    comment_id: number,
    body: string,
    created_at: string,
    updated_at: string
}
export interface IClafileContentAndSha {
    claFileContent: any,
    sha: string
}
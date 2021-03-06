const Git = require('nodegit')
const _ = require('lodash')
const logger = require('./simple-logger')
const getFetchOpts = require('./get-fetch-opts')
const MergeError = require('./merge-error')
const parseBranchName = require('./parse-branch-name')
const getBranches = require('./get-branches')

const log = logger.log('mergeBranchPair:log')
const error = logger.error('mergeBranchPair:error')


function fetch(githubToken, repoConfig, repo) {
  log(`fetch ${repoConfig.name} from remote ${repoConfig.remote_name}`)

  function resolveBranchCommits(allBranches) {
    return Promise.all(allBranches.map(branch => repo.getBranchCommit(branch)))
      .then(commits => _.zip(allBranches, commits))
  }

  const isHeadErrorRe = /Cannot force update branch '.*' as it is the current HEAD of the repository\./i

  function createLocalBranch([remoteBranchName, commit]) {
    return repo.createBranch(parseBranchName(remoteBranchName, repoConfig.remote_name), commit, true)
      .catch(err => {
        // ignore error if trying to update current HEAD
        if (!isHeadErrorRe.test(err.message)) {
          throw err
        }
      })
  }

  return repo.fetchAll(getFetchOpts(githubToken, repoConfig))
    .then(() => getBranches(repoConfig))
    .then(resolveBranchCommits)
    .then(branchCommitsPairs => Promise.all(branchCommitsPairs.map(createLocalBranch)))
    .then(() => repo)
}

function pullBranch(repo, repoConfig, branchName) {
  if (repo.isMerging()) {
    throw new Error(`repository ${repoConfig.name} is already in mergeing state`)
  }
  const localBranchName = parseBranchName(branchName, repoConfig.remote_name)
  return repo.mergeBranches(localBranchName, branchName)
    .then(() => localBranchName)
    .catch(index => {
      if (_.isFunction(_.get(index, 'hasConflicts')) && index.hasConflicts()) {
        const conflictingEntries = index.entries().filter(entry => Git.Index.entryIsConflict(entry))
        throw new MergeError(`merge conflict occured when trying to pull ${branchName}`, conflictingEntries, {head: localBranchName, upstream: branchName})
      } else if (index instanceof Error) {
        throw index
      } else {
        throw new Error(`an error occured when trying to pull ${branchName}`)
      }
    })
}

function push(githubToken, repoConfig, {repo, head}) {
  log(`push ${repoConfig.name} from remote ${repoConfig.remote_name}, branch ${head}`)
  return repo.getRemote(repoConfig.remote_name)
    .then(remote => remote.push([`refs/heads/${head}:refs/heads/${head}`], getFetchOpts(githubToken, repoConfig, true)))
    .then(() => repo)
}

function resolveRef(repo, repoConfig, refName) {
  log(`resolve ${refName} for repo ${repoConfig.name}`)
  return Git.Reference.lookup(repo, refName)
    .then(ref => ref.shorthand())
    .catch(() => refName)
}

function merge(repoConfig, {repo, branchPair}) {
  const [upstream, head] = branchPair
  log(`attempt to merge ${upstream} to ${head} in repo ${repoConfig.name}`)
  return repo.mergeBranches(head, upstream)
    .then(oid => {
      const oidStr = _.isFunction(_.get(oid, 'tostrS')) ? oid.tostrS() : oid
      log(`branch ${upstream} of repo ${repoConfig.name} was successfully merged (oid: ${oidStr})`)
      return {repo, head}
    })
    .catch(index => {
      error(`merge ${upstream} to ${head} failed in repo ${repoConfig.name}`)
      if (_.isFunction(_.get(index, 'hasConflicts')) && index.hasConflicts()) {
        const conflictingEntries = index.entries().filter(entry => Git.Index.entryIsConflict(entry))
        error(`merge conflict in repo ${repoConfig.name} occured when trying to merge ${upstream}`)
        throw new MergeError(`merge conflict occured when trying to merge ${upstream}`, conflictingEntries, {head, upstream})
      } else if (index instanceof Error) {
        throw index
      } else {
        throw new Error(`an error occured when trying to merge ${upstream} into ${head}`)
      }
    })
}

/**
 * Attempt to merge branch `head` into `upstream`.
 *
 * @param  {string} githubToken GitHub access token, will be ignored if falsey value.
 * @param  {string} repoConfig  Repository sync-config object.
 * @param  {string} upstreamRef Name of branch to merge into.
 * @param  {string} headRef     Name of branch to take as head of merge.
 *
 * @return {Promise}            Promise resolved when merge was successful or
 *                              rejected if there was an error in the checkout + merge process.
 */
function mergeBranchPair(githubToken, {repoConfig, refsBranchPair}) {
  if (!_.isString(githubToken)) {
    throw Error(`mergeBranchPair: githubToken value is not string (got ${typeof githubToken})`)
  }

  if (_.isUndefined(repoConfig)) {
    throw Error('mergeBranchPair: repoConfig is undefined')
  }

  if (!_.isArrayLike(refsBranchPair) || refsBranchPair.length !== 2) {
    throw Error(`mergeBranchPair: invalid branchPairs value for repo ${repoConfig.name} (got ${refsBranchPair})`)
  }

  const [upstreamRef, headRef] = refsBranchPair
  log(`attempt to merge branch ${headRef} into ${upstreamRef} in repository at ${repoConfig.local_path}`)
  return Git.Repository.open(repoConfig.local_path)
    .then(fetch.bind(null, githubToken, repoConfig))
    .then(repo => (
      Promise.all([upstreamRef, headRef].map(resolveRef.bind(null, repo, repoConfig)))
        .then(branchPair => ({repo, branchPair}))
    ))
    .then(({repo, branchPair}) => (
      Promise.all(branchPair.map(pullBranch.bind(null, repo, repoConfig)))
        .then(localBranchPair => ({repo, branchPair: localBranchPair}))
    ))
    .then(merge.bind(null, repoConfig))
    .then(push.bind(null, githubToken, repoConfig))
}

module.exports = mergeBranchPair

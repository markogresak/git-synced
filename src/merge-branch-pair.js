const Git = require('nodegit')
const _ = require('lodash')
const logger = require('./simple-logger')
const getFetchOpts = require('./get-fetch-opts')
const MergeError = require('./merge-error')
const parseBranchName = require('./parse-branch-name')

const log = logger.log('mergeBranchPair:log')
const error = logger.error('mergeBranchPair:error')


function fetch(githubToken, repoConfig, repo) {
  log(`fetch ${repoConfig.name} from remote ${repoConfig.remote_name}`)
  return repo.fetchAll(getFetchOpts(githubToken))
    .then(() => repo)
}

function pullBranch(repo, repoConfig, branchName) {
  const localBranchName = parseBranchName(branchName, repoConfig.remote_name)
  return repo.mergeBranches(localBranchName, branchName)
    .then(() => localBranchName)
    .catch(index => {
      if (_.isFunction(_.get(index, 'hasConflicts')) && index.hasConflicts()) {
        const conflictingEntries = index.entries().filter(entry => Git.Index.entryIsConflict(entry))
        throw new MergeError(`merge conflict occured when trying to pull ${branchName}`, conflictingEntries)
      } else {
        throw new MergeError(`merge conflict occured when trying to pull ${branchName}`)
      }
    })
}

function push(githubToken, repoConfig, {repo, head}) {
  log(`push ${repoConfig.name} from remote ${repoConfig.remote_name}, branch ${head}`)
  return repo.getRemote(repoConfig.remote_name)
    .then(remote => remote.push([`refs/heads/${head}:refs/heads/${head}`], getFetchOpts(githubToken)))
    .then(() => repo)
}

function resolveRef(repo, refName) {
  log(`resolve ${refName}`)
  // return Promise.resolve(refName)
  return Git.Reference.lookup(repo, refName)
    .then(ref => ref.shorthand())
    .catch(() => refName)
}

function merge(repoPath, {repo, branchPair}) {
  const [upstream, head] = branchPair
  log(`attempt to merge ${upstream} to ${head}`)
  return repo.mergeBranches(head, upstream)
    .then(oid => {
      const oidStr = _.isFunction(_.get(oid, 'tostrS')) ? oid.tostrS() : oid
      log(`branch ${upstream} was successfully merged (oid: ${oidStr})`)
      return {repo, head}
    })
    .catch(index => {
      error(`merge ${upstream} to ${head} failed`)
      if (_.isFunction(_.get(index, 'hasConflicts')) && index.hasConflicts()) {
        const conflictingEntries = index.entries().filter(entry => Git.Index.entryIsConflict(entry))
        error(`merge conflict occured when trying to merge ${upstream}`)
        throw new MergeError(`merge conflict occured when trying to merge ${upstream}`, conflictingEntries)
      } else {
        throw index
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
    throw Error(`mergeBranchPair: invalid branchPairs value (got ${refsBranchPair})`)
  }

  const [upstreamRef, headRef] = refsBranchPair
  log(`attempt to merge branch ${headRef} into ${upstreamRef} in repository at ${repoConfig.local_path}`)
  return Git.Repository.open(repoConfig.local_path)
    .then(fetch.bind(null, githubToken, repoConfig))
    .then(repo => (
      Promise.all([upstreamRef, headRef].map(resolveRef.bind(null, repo)))
        .then(branchPair => ({repo, branchPair}))
    ))
    .then(({repo, branchPair}) => (
      Promise.all(branchPair.map(pullBranch.bind(null, repo, repoConfig)))
        .then(localBranchPair => ({repo, branchPair: localBranchPair}))
    ))
    .then(merge.bind(null, repoConfig.local_path))
    .then(push.bind(null, githubToken, repoConfig))
}

module.exports = mergeBranchPair

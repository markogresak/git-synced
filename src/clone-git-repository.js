const fs = require('fs')
const rimraf = require('rimraf')
const Git = require('nodegit')
const logger = require('./simple-logger')
const getFetchOpts = require('./get-fetch-opts')

const log = logger.log('initGitRepository:log')
const error = logger.error('initGitRepository:error')


function checkIfRepositoryExists(repoPath) {
  return new Promise((resolve, reject) => {
    log(`check if path ${repoPath} exists`)
    fs.access(repoPath, fs.constants.F_OK, noPathErr => {
      // when the error is set, path does not exist
      if (noPathErr) {
        error(`fs.access(F_OK) error for path '${repoPath}': ${noPathErr}`)
        return resolve(false)
      }

      log(`check for write permissions at path ${repoPath}`)
      fs.access(repoPath, fs.constants.W_OK, noPermissionErr => {
        if (noPermissionErr) {
          error(`fs.access(W_OK) error for path '${repoPath}': ${noPermissionErr}`)
          return reject(noPermissionErr)
        }
        log(`user has write permissions for directory ${repoPath}`)
        resolve(true)
      })
    })
  })
}

function processSubmodule(repoConfig, cloneOptions, repo, submoduleName) {
  log(`Lookup for submodule ${submoduleName} for repo ${repoConfig.name}`)
  return Git.Submodule.lookup(repo, submoduleName).then(submodule => {
    log(`Setting up submodule ${submodule.path()} for repo ${repoConfig.name}`)

    // Adapted from https://github.com/nodegit/nodegit/issues/560#issuecomment-127983557
    return submodule.init(1)
      .then(() => log(`Submodule init for repo ${repoConfig.name} was successful`))
      .then(() => submodule.update(0, new Git.SubmoduleUpdateOptions()))
      .then(() => log(`Submodule update for repo ${repoConfig.name} was successful`))
      .catch(err => error(`Submodule setup for repo ${repoConfig.name} failed: ${err.toString()}\n${err.stack}`))
  })
}

function cloneRepository(repoUrl, repoPath, cloneOptions, repoConfig) {
  log(`clone repository from url ${repoUrl} to ${repoPath}`)
  const cloneStartTime = process.uptime() * 1000
  return Git.Clone(repoUrl, repoPath, cloneOptions)
    .then(repo => {
      const cloneEndTime = process.uptime() * 1000
      log(`clone ${repoUrl}: ${cloneEndTime - cloneStartTime}ms`)
      if (repoConfig.submodule) {
        log(`The repo ${repoConfig.name} is configured with submodule, setting up submodules...`)
        return repo.getSubmoduleNames()
          .then(names => Promise.all(names.map(processSubmodule.bind(null, repoConfig, cloneOptions, repo))))
          .then(() => log(`Submodules for repo ${repoConfig.name} was successfully configured`))
          .catch(err => error(`An error occured while configuring submodules for ${repoConfig.name}, ${err.toString()}\n${err.stack}`))
          .then(() => repo)
      }

      return repo
    })
    .catch(err => {
      error(`git clone for repo '${repoUrl}' exited with error: ${err.toString()}\n${err.stack}`)
      // throw error to propagate it to next .catch
      throw err
    })
}

function removeRepo(repoPath, repoConfig, force) {
  if (!force) {
    return Promise.resolve()
  }

  log(`Got force = true for ${repoConfig.name}, removing the repo before cloning...`)
  return new Promise(resolve => rimraf(repoPath, resolve))
}

/**
 * Try to clone a repo to path if it doesn't exist yet.
 *
 * @param  {string} githubToken     GitHub access token, will be ignored if falsey value.
 * @param  {object} repoConfig      Configuration for repository to clone, expecting
 *                                    `local_path` (Local path to repository) and
 *                                    `remote_url` (Url to be used with `git clone`) keys.
 * @param  {boolean} [force=false]  (optional) If true, the repo will first be removed and then cloned again.
 *
 * @return {Promise}            Promise resolved after repo is cloned or rejected if there was an error
 *                              with `repoPath` access permissions or with `git clone` command.
 */
function cloneGitRepository(githubToken, repoConfig, force = false) {
  const {local_path: repoPath, remote_url: repoUrl} = repoConfig
  const cloneOptions = {
    fetchOpts: getFetchOpts(githubToken, repoConfig),
  }

  // Explicit check if force is boolean value of true to prevent any other truthy values.
  const isForce = force === true

  return checkIfRepositoryExists(repoPath).then(exists => {
    if (exists && !isForce) {
      log(`repository at ${repoPath} already exists, skip cloning`)
      // repository already exists, skip clone
      return Git.Repository.open(repoPath)
    }

    // If it's true, first remove the repo, then proceed with cloning
    return removeRepo(repoPath, repoConfig, isForce === true)
      .then(() => log(`Repo ${repoConfig.name} was removed, proceeding with cloning...`))
      .then(() => cloneRepository(repoUrl, repoPath, cloneOptions, repoConfig))
  })
}

module.exports = cloneGitRepository

const fs = require('fs')
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
        error(`fs.access(F_OK) error: ${noPathErr}`)
        return resolve(false)
      }

      log(`check for write permissions at path ${repoPath}`)
      fs.access(repoPath, fs.constants.W_OK, noPermissionErr => {
        if (noPermissionErr) {
          error(`fs.access(W_OK) error: ${noPermissionErr}`)
          return reject(noPermissionErr)
        }
        log(`user has write permissions for directory ${repoPath}`)
        resolve(true)
      })
    })
  })
}

function cloneRepository(repoUrl, repoPath, cloneOptions) {
  log(`clone repository from url ${repoUrl} to ${repoPath}`)
  const cloneStartTime = process.uptime() * 1000
  return Git.Clone(repoUrl, repoPath, cloneOptions)
    .then(repo => {
      const cloneEndTime = process.uptime() * 1000
      log(`clone ${repoUrl}: ${cloneEndTime - cloneStartTime}ms`)
      return repo
    })
    .catch(err => {
      error(`git clone exited with error: ${err}`)
      // throw error to propagate it to next .catch
      throw err
    })
}

/**
 * Try to clone a repo to path if it doesn't exist yet.
 *
 * @param  {string} githubToken GitHub access token, will be ignored if falsey value.
 * @param  {string} local_path  Local path to repository.
 * @param  {string} remote_url  Url to be used with `git clone`.
 *
 * @return {Promise}            Promise resolved after repo is cloned or rejected if there was an error
 *                              with `repoPath` access permissions or with `git clone` command.
 */
function cloneGitRepository(githubToken, {local_path: repoPath, remote_url: repoUrl}) {
  const cloneOptions = {
    fetchOpts: getFetchOpts(githubToken)
  }

  return checkIfRepositoryExists(repoPath).then(exists => {
    if (exists) {
      log(`repository at ${repoPath} already exists, skip cloning`)
      // repository already exists, skip clone
      return Git.Repository.open(repoPath)
    }
    return cloneRepository(repoUrl, repoPath, cloneOptions)
  })
}

module.exports = cloneGitRepository

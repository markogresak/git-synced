/* eslint-disable no-console */

const npid = require('npid')

try {
  const pid = npid.create('./git-synced.pid', true)
  pid.removeOnExit()
} catch (err) {
  console.error(err)
  process.exit(1)
}

const githubhook = require('githubhook')
require('dotenv').config()

const logger = require('./src/simple-logger')
const getSyncConfig = require('./src/get-sync-config')
const cloneGitRepository = require('./src/clone-git-repository')
const setGitConfig = require('./src/set-git-config')
const getBranches = require('./src/get-branches')
const getBranchPairs = require('./src/get-branch-pairs')
const mergeBranchPair = require('./src/merge-branch-pair')
const startWorkerQueue = require('./src/worker-queue')
const MergeError = require('./src/merge-error')
const sendMail = require('./src/send-mail')
const initPing = require('./src/init-ping')

const log = logger.log('index:log')
const error = logger.error('index:error')

const expectedEnvVars = ['GITHUB_WEBHOOK_SECRET']

expectedEnvVars.forEach(envVar => {
  if (typeof process.env[envVar] !== 'string') {
    throw new Error(`Missing enviroment variable ${envVar}`)
  }
})


function setupGitHubWebhook() {
  const githubWebhook = githubhook({
    path: '/github/callback',
    port: process.env.PORT || 8080,
    secret: process.env.GITHUB_WEBHOOK_SECRET,
  })
  githubWebhook.listen()
  return githubWebhook
}


function pushEventProcessor(repoConfig, workerQueue, {payload: {ref}}) {
  log(`begin pushEventProcessor for repo ${repoConfig.name} on ref ${ref}`)
  return Promise.resolve(repoConfig)
    .then(getBranches)
    .then(allBranches => getBranchPairs(allBranches, ref, 1))
    .then(([refsBranchPair]) => {
      if (!refsBranchPair) {
        return log('No next branch to merge into')
      }
      return mergeBranchPair(process.env.GITHUB_TOKEN, {repoConfig, refsBranchPair})
    })
    .then(() => log(`done with pushEventProcessor for repo ${repoConfig.name} on ref ${ref}`))
    .catch(err => {
      workerQueue.cancelAllPending()
      error(`processor error: ${err.toString()}\n${err.stack}`)
      if (err instanceof MergeError) {
        console.log('err.conflicts.length', err.conflicts.length)
        const files = `<h4>Files:</h4><ul>${err.conflicts.map(entry => `<li>${entry.path}<li>`).join('')}</ul>`
        const conflictDescription = err.head && err.upstream
          ? `"${err.upstream}" into "${err.head}" in repository "${repoConfig.name}"`
          : `"${ref}" in repository "${repoConfig.name}"`

        sendMail({
          subject: `Merge conflict in "${repoConfig.name}".`,
          html: `
            <p>A merge conflict occured while trying to merge ${conflictDescription}</p>

            ${err.conflicts.length > 0 ? files : ''}
          `
        })
      }
    })
}

function queueMergeJob(repoConfig, workerQueue, payload) {
  return workerQueue.addMessage({processor: pushEventProcessor.bind(null, repoConfig, workerQueue), payload})
    .catch(() => {
      log(`job in ${repoConfig.name} regarding ref "${payload.ref}" was canceled`)
    })
}

function queueSyncAtStart(syncConfig, workerQueue) {
  if (process.env.SYNC_AT_START !== 'true') {
    return Promise.resolve()
  }

  function queueSyncForRepo(repoConfig) {
    return Promise.resolve(repoConfig)
      .then(getBranches)
      .then(getBranchPairs)
      .then(allBranchPairs => allBranchPairs.forEach(([head]) => queueMergeJob(repoConfig, workerQueue, {ref: head})))
  }

  return Promise.all(syncConfig.repositories.map(queueSyncForRepo))
}

function cloneAndSetup(gitConfig, repoConfig) {
  return cloneGitRepository(process.env.GITHUB_TOKEN, repoConfig)
    .then(setGitConfig.bind(null, gitConfig))
}

function run() {
  const syncConfig = getSyncConfig()
  const workerQueue = startWorkerQueue()

  initPing()
  Promise.all(syncConfig.repositories.map(cloneAndSetup.bind(null, syncConfig.gitConfig)))
    .then(queueSyncAtStart.bind(null, syncConfig, workerQueue))
    .then(() => {
      const githubWebhook = setupGitHubWebhook()
      syncConfig.repositories.forEach(repoConfig => {
        githubWebhook.on(`push:${repoConfig.name}`, (ref, data) => {
          const remoteRef = ref.replace('/heads/', `/remotes/${repoConfig.remote_name}/`)
          queueMergeJob(repoConfig, workerQueue, {ref: remoteRef, data})
        })
      })
    })
    .catch(err => {
      error('clone error:', err)
    })
}

run()

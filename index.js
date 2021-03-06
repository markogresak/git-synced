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
const sendConflictMail = require('./src/send-conflict-mail')
const initPing = require('./src/init-ping')

const log = logger.log('index:log')
const error = logger.error('index:error')

const expectedEnvVars = ['GITHUB_WEBHOOK_SECRET', 'GITHUB_TOKEN']

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


function pushEventProcessor(syncConfig, repoConfig, workerQueue, {payload: {ref}}) {
  log(`begin pushEventProcessor for repo ${repoConfig.name} on ref ${ref}`)
  return Promise.resolve(repoConfig)
    .then(getBranches)
    .then(allBranches => getBranchPairs(allBranches, ref, 1))
    .then(([refsBranchPair]) => {
      if (!refsBranchPair) {
        return log(`No next branch to merge into for repo ${repoConfig.name}`)
      }
      return mergeBranchPair(process.env.GITHUB_TOKEN, {repoConfig, refsBranchPair})
    })
    .then(() => log(`done with pushEventProcessor for repo ${repoConfig.name} on ref ${ref}`))
    .catch(err => {
      workerQueue.cancelAllPending(repoConfig.name)
      log(`processing on repo ${repoConfig.name} failed, canceled all pending jobs for this repo`)
      error(`processor error for repo ${repoConfig.name}: ${err.toString()}\n${err.stack}`)
      if (err instanceof MergeError) {
        sendConflictMail(process.env.GITHUB_TOKEN, {repoConfig, ref, err})
          .then(() => log(`mail sent for confict "${err.upstream}" -> "${err.head}" in repo "${repoConfig.name}"`))
      } else {
        error(`unknown processor error for repo ${repoConfig.name}: ${err.toString()}\n${err.stack}`)
        log(`removing repo ${repoConfig.name} and cloning it again`)
        return cloneAndSetup(syncConfig.gitConfig, repoConfig, true)  // eslint-disable-line no-use-before-define
          .then(queueSyncAtStart.bind(null, syncConfig, workerQueue)) // eslint-disable-line no-use-before-define
          .then(() => log(`repo ${repoConfig.name} was successfully re-cloned`))
      }
    })
}

function queueMergeJob(syncConfig, repoConfig, workerQueue, payload) {
  return workerQueue.addMessage({processor: pushEventProcessor.bind(null, syncConfig, repoConfig, workerQueue), payload}, repoConfig.name)
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
      .then(allBranchPairs => allBranchPairs.forEach(([head]) => queueMergeJob(syncConfig, repoConfig, workerQueue, {ref: head})))
  }

  return Promise.all(syncConfig.repositories.map(queueSyncForRepo))
}

function cloneAndSetup(gitConfig, repoConfig, force) {
  return cloneGitRepository(process.env.GITHUB_TOKEN, repoConfig, force)
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
          const doesPushedBranchMatch = repoConfig.branches.some(branch => branch.nameFilterFn(ref))
          if (doesPushedBranchMatch) {
            const remoteRef = ref.replace('/heads/', `/remotes/${repoConfig.remote_name}/`)
            queueMergeJob(syncConfig, repoConfig, workerQueue, {ref: remoteRef, data})
          }
        })
      })
    })
    .catch(err => {
      error('clone error:', err)
    })
}

run()

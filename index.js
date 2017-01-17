/* eslint-disable no-console */

const npid = require('npid')

try {
  const pid = npid.create('/var/run/git-synced.pid')
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
const getBranches = require('./src/get-branches')
const getBranchPairs = require('./src/get-branch-pairs')
const mergeBranchPair = require('./src/merge-branch-pair')
const startWorkerQueue = require('./src/worker-queue')

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


function pushEventProcessor(repoConfig, {payload: {ref}}) {
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
    .catch(err => error(`processor error: ${err.toString()}\nerr.stack`))
}

function queueMergeJob(repoConfig, workerQueue, payload) {
  return workerQueue.addMessage({processor: pushEventProcessor.bind(null, repoConfig), payload})
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

function run() {
  const syncConfig = getSyncConfig()
  const workerQueue = startWorkerQueue()

  Promise.all(syncConfig.repositories.map(cloneGitRepository.bind(null, process.env.GITHUB_TOKEN)))
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

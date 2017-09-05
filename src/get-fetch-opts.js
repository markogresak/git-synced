const Git = require('nodegit')
const logger = require('./simple-logger')

const log = logger.log('transfer:log')

const lastPrintedPercent = {}

function logTransferProgress(repoConfig, progress) {
  const receivedObjects = progress.receivedObjects()
  const totalObjects = progress.totalObjects()
  const percent = Math.round((receivedObjects / totalObjects) * 100)
  if (lastPrintedPercent[repoConfig.name] !== percent) {
    log(`clone progress for ${repoConfig.name}: ${percent}% (${receivedObjects}/${totalObjects})`)
    lastPrintedPercent[repoConfig.name] = percent
  }
}

function getFetchOpts(githubToken, repoConfig, push = false) {
  const fetchOpts = {
    callbacks: {
      // github will fail cert check on some OSX machines, this overrides that check
      certificateCheck: () => 1,
      transferProgress: logTransferProgress.bind(null, repoConfig),
    }
  }
  if (!push) {
    Object.assign(fetchOpts, {
      downloadTags: 1,
      prune: 1,
      updateFetchhead: 1,
    })
  }
  if (githubToken) {
    fetchOpts.callbacks.credentials = () => Git.Cred.userpassPlaintextNew(githubToken, 'x-oauth-basic')
  }
  return fetchOpts
}

module.exports = getFetchOpts

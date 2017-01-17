const Git = require('nodegit')

function getFetchOpts(githubToken, push = false) {
  const fetchOpts = {
    callbacks: {
      // github will fail cert check on some OSX machines, this overrides that check
      certificateCheck: () => 1,
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

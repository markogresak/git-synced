const _ = require('lodash')
const Octokit = require('@octokit/rest')
const gitUrlParse = require('git-url-parse')
const sendMail = require('./send-mail')
const logger = require('./simple-logger')

const error = logger.error('sendConflictMail:error')

function createNewPr(token, {repoConfig, err}) {
  const body = `This PR was created because I wasn't able to automatically merge "${err.upstream}" into "${err.head}".
  Please fix the conflicts and manually merge branch "${err.upstream}".`

  const prOpts = {
    owner: gitUrlParse(repoConfig.remote_url).owner,
    repo: repoConfig.name,
    head: err.upstream,
    base: err.head,
    title: `[git-synced]: confict for "${err.upstream}" -> "${err.head}"`,
    body,
  }

  const octokit = new Octokit()
  octokit.authenticate({
    type: 'token',
    token,
  })
  return octokit.pullRequests.create(prOpts)
    .then(response => {
      console.log('create PR response:', response)
      return response.data.html_url
    })
    .catch(requestErr => {
      error(`An error occured while trying to create PR on repo ${repoConfig.name} for merge "${err.upstream}" into "${err.head}": ${requestErr}`)
    })
}

function generateMailBody({repoConfig, ref, err}, prUrl) {
  const conflicts = _.uniqBy(err.conflicts, entry => entry.path)
  const files = `<h4>Files:</h4><ul>${conflicts.map(entry => `<li>${entry.path}<li>`).join('')}</ul>`

  const repoUrl = gitUrlParse(repoConfig.remote_url).href
  const repoUrlHtml = repoUrl ? `<a href="${repoUrl}">"${repoConfig.name}"</a>` : `"${repoConfig.name}"`
  const conflictDescription = err.head && err.upstream
    ? `"${err.upstream}" into "${err.head}" in repository ${repoUrlHtml}`
    : `"${ref}" in repository ${repoUrlHtml}`

  const prUrlHtml = prUrl ? `<br/> <p>See the conflicts: <a href="${prUrl}">${prUrl}</a></p>` : ''

  return `
    <p>A merge conflict occured while trying to merge ${conflictDescription}.</p>

    ${prUrlHtml}

    ${conflicts.length > 0 ? files : ''}
  `
}

function sendConflictMail(token, {repoConfig, ref, err}) {
  return createNewPr(token, {repoConfig, err})
    .then(generateMailBody.bind(null, {repoConfig, ref, err}))
    .then(mailBodyHtml => sendMail({
      subject: `Merge conflict in "${repoConfig.name}"`,
      html: mailBodyHtml,
    }))
}

module.exports = sendConflictMail

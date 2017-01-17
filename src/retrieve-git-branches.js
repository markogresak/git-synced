const Git = require('nodegit')

/**
 * Retrieve a list of all remote branches for given remote.
 *
 * @param  {String} repoPath          Path to git repository.
 * @param  {String} [remote='origin'] Name of remote to use, defaults to origin.
 *
 * @return {Promise}                  Promise, resolved with list of branch names
 */
function retrieveGitBranches(repoPath, remote = 'origin') {
  return Git.Repository.open(repoPath)
    .then(repo => repo.getReferences(Git.Reference.TYPE.LISTALL))
    .then(refs => refs.filter(ref => ref.isRemote() && ref.name().includes(remote)))
    .then(refs => refs.map(ref => ref.name()))
}

module.exports = retrieveGitBranches

const _ = require('lodash')
const retrieveGitBranches = require('./retrieve-git-branches')


function filterBranchesByConfig(branches, branchConfig) {
  const matchedBrances = branches.filter(branchConfig.nameFilterFn)
  if (typeof branchConfig.sortFn === 'function') {
    return branchConfig.sortFn(matchedBrances)
  }
  return matchedBrances
}

/**
 * Get all branches for given repository.
 *
 * @param  {object} syncConfig  Repository config object.
 *
 * @return {Promise}            Promise resolved with array of branches based on config,
 *                              or rejected if there was an error when trying to retrieve git branches.
 */
function getBranches(syncConfig) {
  return retrieveGitBranches(syncConfig.local_path)
    .then(branches => _.uniq(_.flatMap(syncConfig.branches, filterBranchesByConfig.bind(null, branches))))
}

module.exports = getBranches

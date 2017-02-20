const fs = require('fs')
const path = require('path')
const yaml = require('yamljs')
const semverSort = require('semver-sort')
const _ = require('lodash')

const projectRoot = path.resolve(__dirname, '..')
const defaultConfigPath = path.resolve(projectRoot, './sync-config.yml')
const defaultBranchConfig = {
  // alphabetical sort
  sortFn: _.curryRight(_.sortBy, _.identity),
}

function findConfigObjectKey(obj) {
  return _.findKey(obj, val => val === null)
}

function parseBranchConfig(branch) {
  const branchConfig = {}
  // if branches entry is specified without extra options, treat it as branch name
  if (typeof branch === 'string') {
    branchConfig.name = branch
    const branchNameRegex = new RegExp(`^(.*/)?${branch}$`, 'i')
    branchConfig.nameFilterFn = branchName => branchNameRegex.test(branchName)
  } else if (typeof branch === 'object') {
    // - release:\n... in yaml is parsed to {release: null, ...}
    const name = findConfigObjectKey(branch)
    branchConfig.name = name
    if (branch.regex) {
      // strip heading and trailing / if b
      const branchRegex = new RegExp(branch.regex.replace(/^\/?(.*?)\/?$/, '$1'))
      branchConfig.nameFilterFn = branchName => branchRegex.test(branchName)
    }

    if (branch.sort === 'semver') {
      branchConfig.sortFn = semverSort.asc
    }
  }

  return Object.assign({}, defaultBranchConfig, branchConfig)
}

function parseGitConfig(syncConfig) {
  return _.map(syncConfig.git_config, configObj => {
    const name = _.keys(configObj)[0]
    return {name, value: configObj[name]}
  })
}

/**
 * Load config from `configPath` and parse it for later branch filtering and sorting.
 *
 * @param  {string} configPath  (optional)  Path to config. Defaults to `sync-config.yml` in project root.
 *
 * @return {object}                         Parsed config.
 */
function getSyncConfig(configPath = defaultConfigPath) {
  try {
    fs.accessSync(configPath, fs.constants.F_OK)
  } catch (e) {
    throw new Error(`No sync-config found at path ${configPath}`)
  }

  const syncConfig = yaml.load(configPath)
  return {
    gitConfig: parseGitConfig(syncConfig),
    repositories: syncConfig.repositories.map(repo => {
      const {remote_url, remote_name: remoteName = 'origin', local_path: localPath, branches} = repo
      return {
        name: findConfigObjectKey(repo),
        remote_url,
        remote_name: remoteName,
        local_path: path.resolve(projectRoot, localPath),
        branches: branches.map(parseBranchConfig),
      }
    })
  }
}

module.exports = getSyncConfig

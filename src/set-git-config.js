const logger = require('./simple-logger')

const log = logger.log('setGitConfig:log')

function setConfig(config, gitConfig, i = 0) {
  if (i >= gitConfig.length) {
    return Promise.resolve()
  }
  const {name, value} = gitConfig[i]
  log(`set config ${name} = ${value}`)
  return config.setString(name, value)
    .then(() => setConfig(config, gitConfig, i + 1))
}

function setGitConfig(gitConfig, repo) {
  return repo.config()
    .then(config => setConfig(config, gitConfig))
}

module.exports = setGitConfig

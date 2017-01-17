const nodemailer = require('nodemailer')
const mg = require('nodemailer-mailgun-transport')
const logger = require('./simple-logger')

const log = logger.log('mail:log')
const error = logger.log('mail:error')

const requiredEnv = [
  'MAILGUN_API_KEY',
  'MAILGUN_DOMAIN',
  'MAIL_SEND_FROM',
  'MAIL_SEND_TO',
]

function checkEnv() {
  return requiredEnv.every(envKey => typeof process.env[envKey] !== 'undefined')
}

function init() {
  if (!checkEnv()) {
    log('env variables missing, skipping mailer config')
    return
  }

  const auth = {
    auth: {
      api_key: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
    }
  }

  return nodemailer.createTransport(mg(auth))
}

function onMailSent(resolve, reject, err, info) {
  if (err) {
    error(err)
    return reject(err)
  }
  resolve(info)
}

function sendMail({subject, html}) {
  const instance = init()
  if (!instance) {
    return
  }
  const from = process.env.MAIL_SEND_FROM
  const to = process.env.MAIL_SEND_TO.split(',')
  log(`send mail to ${to.join()}`)
  return new Promise((resolve, reject) => {
    instance.sendMail({from, to, subject, html}, onMailSent.bind(null, resolve, reject))
  })
}

module.exports = sendMail

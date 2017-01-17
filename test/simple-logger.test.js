import test from 'ava'
import sinon from 'sinon'
import MockDate from 'mockdate'
import {write} from '../src/simple-logger'

const now = new Date()
MockDate.set(now)

test('simple-logger with a single message', t => {
  const logFn = sinon.spy()
  const msg = 'abc'
  const expected = `[${now.toUTCString()}]: ${msg}`

  write(logFn)(msg)
  t.is(logFn.args[0][0], expected)
})

test('simple-logger with multiple messages', t => {
  const logFn = sinon.spy()
  const msg1 = 'abc'
  const msg2 = 'def'
  const expected = `[${now.toUTCString()}]: ${msg1} ${msg2}`

  write(logFn)(msg1, msg2)
  t.is(logFn.args[0][0], expected)
})

test('simple-logger with label and a single message', t => {
  const logFn = sinon.spy()
  const label = 'lbl'
  const msg = 'abc'
  const expected = `[${now.toUTCString()}] - ${label}: ${msg}`

  write(logFn, label)(msg)
  t.is(logFn.args[0][0], expected)
})

test('simple-logger with label and multiple messages', t => {
  const logFn = sinon.spy()
  const label = 'lbl'
  const msg1 = 'abc'
  const msg2 = 'def'
  const expected = `[${now.toUTCString()}] - ${label}: ${msg1} ${msg2}`

  write(logFn, label)(msg1, msg2)
  t.is(logFn.args[0][0], expected)
})

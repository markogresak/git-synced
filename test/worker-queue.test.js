import test from 'ava'
import sinon from 'sinon'
import _ from 'lodash'
import startWorkerQueue from '../src/worker-queue'

function longProcessor() {
  return new Promise(resolve => {
    setTimeout(resolve, 100)
  })
}

function voidProcessor() {
  return (() => {})
}

function assertSingleProcessor(t, getProcessor) {
  const workerQueue = startWorkerQueue()
  const processor = getProcessor()
  const message = {processor, payload: {data: 'msg 1'}}

  return workerQueue.addMessage(message).then(() => {
    t.true(processor.calledOnce,
      'provided processor function should be called once')
    t.true(processor.calledWith(message),
      'provided processor function should be called with full message object as argument')
  })
}

function assertMultipleProcessors(t, getProcessor) {
  const workerQueue = startWorkerQueue()
  const messages = _.range(5).map(i => ({processor: getProcessor(), payload: {data: `msg ${i}`}}))
  const addMessagePromises = Promise.all(messages.map(workerQueue.addMessage))

  return addMessagePromises.then(() => {
    messages.forEach((message, i) => {
      t.true(message.processor.calledOnce)
      t.true(message.processor.calledWith(message))
      if (i > 0) {
        t.true(message.processor.calledAfter(messages[i - 1].processor),
          'message in queue should be processed after the message before was processed')
      }
    })
  })
}

test('workerQueue addMessage (single message)', t => assertSingleProcessor(t, () => sinon.spy()))

test('workerQueue addMessage (single messages) with long-running processor', t => assertSingleProcessor(t, () => sinon.spy(longProcessor)))

test('workerQueue addMessage (single messages) with void processor function', t => assertSingleProcessor(t, () => sinon.spy(voidProcessor)))

test('workerQueue addMessage (multiple messages)', t => assertMultipleProcessors(t, () => sinon.spy()))

test('workerQueue addMessage (multiple messages) with long-running processor', t => assertMultipleProcessors(t, () => sinon.spy(longProcessor)))

test('workerQueue addMessage (multiple messages) with void processor function', t => assertMultipleProcessors(t, () => sinon.spy(voidProcessor)))

test('workerQueue addMessage invalid processor value', t => {
  const workerQueue = startWorkerQueue()
  function callAddMessage(args) {
    return () => workerQueue.addMessage(args)
  }
  t.throws(callAddMessage(), TypeError, 'should throw TypeError if called without any arguments')
  t.throws(callAddMessage(null), TypeError, 'should throw TypeError if called with null')
  t.throws(callAddMessage({data: 'msg 1'}), TypeError, 'should throw TypeError if called without message.processor')
  t.throws(callAddMessage({processor: 'proc'}), TypeError, 'should throw TypeError if message.processor is a string')
  t.throws(callAddMessage({processor: 123}), TypeError, 'should throw TypeError if message.processor is a number')
  t.throws(callAddMessage({processor: [1, 2]}), TypeError, 'should throw TypeError if message.processor is an array')
  t.throws(callAddMessage({processor: {}}), TypeError, 'should throw TypeError if message.processor is an object')
  t.throws(callAddMessage({processor: null}), TypeError, 'should throw TypeError if message.processor is null')
  t.throws(callAddMessage({processor: undefined}), TypeError, 'should throw TypeError if message.processor is undefined')
  t.throws(callAddMessage({processor: true}), TypeError, 'should throw TypeError if message.processor is a boolean')
})

test('workerQueue stop in setImmediate', t => {
  const workerQueue = startWorkerQueue()
  const messages = _.range(5).map(i => ({processor: sinon.spy(longProcessor), payload: {data: `msg ${i}`}}))
  messages.forEach(workerQueue.addMessage)
  const setImmediatePromise = new Promise(resolve => {
    setImmediate(() => {
      workerQueue.stop()
      resolve()
    })
  })

  return setImmediatePromise.then(() => {
    messages.forEach((message, i) => {
      // only first should be called, other messages should not be processed
      const expectedWasCalled = i === 0
      t.is(message.processor.called, expectedWasCalled, 'only first message should have be called')
    })
  })
})

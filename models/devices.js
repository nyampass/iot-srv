'use strict'

const EventEmitter = require('events')
const vm = require('vm')

const redis = require('../config/redis')
const notify = require('./notify')

const emitter = new EventEmitter()

// device keys
const CODE = 'c'
const RESET_ON_FETCH_STATUS = 'r'
const UPDATED_AT = 'u'
const LOG = 'l'
const CURRENT_STATUS = 'cs'
const CURRENT_RESULT = 'cr'

const generate = (name, key) => `device:${name}:${key}`

// redis operators
const mget = (name, ...keys) => redis.mgetAsync(keys.map(key => generate(name, key)))
  .then(values => values.map(value => value === null ? undefined : value))
const mset = (name, kvs) => redis.msetAsync(
  ...Object.keys(kvs).reduce((args, key) => args.concat(generate(name, key), kvs[key]), []))
const set = (name, key, value) => redis.setAsync(generate(name, key), value)
const keys = (name, key) => redis.keysAsync(generate(name, `${key}:*`))

// run code in sandbox
const runCode = (code, name, val, prevVal) => {
  if (code === '') {
    return 'none'
  }

  const ctx = {name, val, prevVal, require, console, notify}
  vm.createContext(ctx)

  try {
    vm.runInContext(code, ctx)
    return 'success'
  } catch (err) {
    return 'failed'
  }
}

const validateName = name => {
  if (name === 'api') {
    throw new Error('invalid name')
  }
}

const device = {
  async status(name) {
    validateName(name)
    const [currentStatus = '0', resetOnFetchStatus = '0'] = await mget(name, CURRENT_STATUS, RESET_ON_FETCH_STATUS)
    if (resetOnFetchStatus === '0') {
      await set(name, CURRENT_STATUS, '0')
    }
    return currentStatus
  },

  async info(name) {
    validateName(name)
    const [code = '', resetOnFetchStatus = '0', updatedAtString] = await mget(name, CODE, RESET_ON_FETCH_STATUS, UPDATED_AT)
    const updatedAt = updatedAtString === null ? '' : new Date(parseInt(updatedAtString, 10))
    return {code, name, resetOnFetchStatus: resetOnFetchStatus === '1', updatedAt}
  },

  async logs(name) {
    validateName(name)
    const ks = await keys(name, LOG)
    const vs = ks.length > 0 ? await redis.mgetAsync(ks) : []
    const logs = []
    for (let i = 0; i < ks.length; i++) {
      const parts = ks[i].split(':')
      const value = vs[i]
      const time = parseInt(parts[parts.length - 1], 10)
      if (!Number.isNaN(time)) {
        logs.push({time, value})
      }
    }
    logs.sort((a, b) => a.time - b.time)
    return {
      logLabels: logs.map(log => new Date(log.time)),
      name, logs
    }
  },

  async updateSettings(name, code, resetOnFetchStatus) {
    validateName(name)
    await mset(name, {[CODE]: code, [RESET_ON_FETCH_STATUS]: resetOnFetchStatus ? '1' : '0'})
  },

  async setStatus(name, value) {
    validateName(name)
    const [code = '', prev] = await mget(name, CODE, CURRENT_STATUS)
    const now = Date.now()
    const result = runCode(code, name, value, prev)
    const logKey = `${LOG}:${now}`
    await redis.multi()
      .mset(
        generate(name, logKey), value,
        generate(name, UPDATED_AT), now,
        generate(name, CURRENT_STATUS), value,
        generate(name, CURRENT_RESULT), result)
      .expire(generate(name, logKey), 86400 * 2)
      .execAsync()
    emitter.emit(`update:${name}`, value)
  },

  async list() {
    return Array.from(new Set((await redis.keysAsync('device:*')).map(key => key.split(':')[1])))
  },

  once(name, handler) {
    emitter.once(name, handler)
    return {
      cancel: () => emitter.removeListener(name, handler)
    }
  }
}

module.exports = device

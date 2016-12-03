'use strict'

const redis = require('../config/redis')

module.exports = {
  async update(os, id, token) {
    await redis.setAsync(`token:${os}:${id}`, token)
  },

  async list(names = []) {
    const keys = names.length === 0 ? await redis.keysAsync('token:*') : names.map(name => `token:${name}`)
    const list = []
    for (const key of keys) {
      const [_, os, id] = key.split(':')
      list.push({key, os, id})
    }

    if (list.length > 0) {
      for (const [i, token] of (await redis.mgetAsync(list.map(i => i.key))).entries()) {
        list[i].token = token
      }
    }

    return list
  }
}

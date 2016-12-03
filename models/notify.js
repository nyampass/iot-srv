'use strict'

const fetch = require('node-fetch')

const tokens = require('./tokens')

const FIREBASE_KEY = process.env.FIREBASE_KEY

module.exports = async (...names) => {
  const list = await tokens.list(names)

  return await Promise.all(list.map(({token}) => fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    body: JSON.stringify({to: token, data: {title: 'iot-srv', body: 'send from iot-srv'}}),
    headers: {
      Authorization: `key=${FIREBASE_KEY}`,
      'Content-Type': 'application/json'
    }
  })))
}

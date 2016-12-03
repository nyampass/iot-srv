const test = require('blue-tape')

const fakeredis = require('fakeredis')
const fetch = require('node-fetch')
const proxyquire = require('proxyquire')
const sleep = require('sleep-promise')

process.env.TEST = 'test'

const redis = proxyquire('./config/redis', {
  redis: fakeredis
})
const app = proxyquire('./app.js', {
  './config/redis': redis
})

test('server is running', t => app
  .then(server => t.is(server.address().address, '0.0.0.0')))

const url = app
  .then(server => {
    const {address, port} = server.address()
    return `http://${address}:${port}`
  })

test('fetch index page', t => url
  .then(url => fetch(`${url}/`))
  .then(res => {
    t.is(res.status, 200)
    return res.text()
  })
  .then(text => {
    t.ok(!/test1/.test(text))
  }))

test('fetch uninitialized device', t => url
  .then(url => fetch(`${url}/test1`))
  .then(res => {
    t.is(res.status, 200)
    return res.text()
  })
  .then(text => {
    t.ok(/test1/.test(text))
    t.ok(!/hello world/.test(text))
    t.ok(!/checked/.test(text))
  }))

const statusSet = (t, url, value) => fetch(`${url}/test1/${value}`)
  .then(res => {
    t.is(res.status, 200)
    return res.text()
  })
  .then(text => {
    t.is(text, 'ok')
  })

const statusGet = (t, url) => fetch(`${url}/test1/status`)
  .then(res => {
    t.is(res.status, 200)
    return res.text()
  })

test('set and get status', t => url
  .then(url => {
    return statusSet(t, url, 42)
      .then(() => statusGet(t, url))
      .then(text => {
        t.is(text, '42')
        return statusSet(t, url, 'on')
      })
      .then(() => statusGet(t, url))
      .then(text => {
        t.is(text, '100')
        return statusSet(t, url, 'off')
      })
      .then(() => statusGet(t, url))
      .then(text => {
        t.is(text, '0')
      })
  }))

test('device created?', t => url
  .then(url => fetch(`${url}/`))
  .then(res => {
    t.is(res.status, 200)
    return res.text()
  })
  .then(text => {
    t.ok(/test1/.test(text))
  }))

test('log', t => url
  .then(url => fetch(`${url}/test1.json`))
  .then(res => {
    t.is(res.status, 200)
    return res.json()
  })
  .then(json => {
    t.is(json.name, 'test1')
    t.is(json.logLabels.length, 3)
    t.is(json.logs.length, 3)
    t.is(json.logs[0].value, '42')
    t.is(json.logs[1].value, '100')
    t.is(json.logs[2].value, '0')
  }))

test('polling (success)', t => url
  .then(url => {
    const polling = fetch(`${url}/test1/status/polling`)
      .then(res => {
        t.is(res.status, 200)
        return res.text()
      })
      .then(text => {
        t.is(text, '84')
      })

    const update = sleep(6000)
      .then(() => statusSet(t, url, 84))

    return Promise.all([polling, update])
  }))

test('polling (failed)', t => url
  .then(url => {
    const polling = fetch(`${url}/test1/status/polling`)
      .then(res => {
        t.is(res.status, 200)
        return res.text()
      })
      .then(text => {
        t.is(text, '84')
      })

    const update = sleep(12000)
      .then(() => statusSet(t, url, 62))

    return Promise.all([polling, update])
  }))

test('update device', t => url
  .then(url => {
    return fetch(`${url}/test1`, {
      redirect: 'manual',
      method: 'POST',
      body: 'code=hello%20world&resetOnFetchStatus=on',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
      .then(res => {
        t.is(res.status, 302)
        return fetch(`${url}/test1`)
      })
      .then(res => {
        t.is(res.status, 200)
        return res.text()
      })
      .then(text => {
        t.ok(/hello world/.test(text))
        t.ok(/checked/.test(text))
        return statusGet(t, url)
      })
      .then(text => {
        t.is(text, '62')
        return statusGet(t, url)
      })
      .then(text => {
        t.ok(text, '0')
      })
  }))

test('close server', () => app
  .then(server => server.close()))

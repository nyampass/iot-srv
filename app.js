'use strict'

const express = require('express')
const bodyParser = require('body-parser')

const device = require('./models/device')

const app = express()

app.use(express.static('public'))

app.set('view engine', 'pug')
app.enable('view cache')

app.use(bodyParser.urlencoded({extended: true}))

app.get('/', (req, res, next) => device.list()
  .then(devices => {
    const host = `${req.protocol}://${req.get('host')}`
    res.render('index', {host, devices})
  })
  .catch(next))

app.get('/:device/status', (req, res, next) => device.status(req.params.device)
  .then(value => res.send(value))
  .catch(next))

app.get('/:device/status/polling', (req, res, next) => {
  let eventToken
  let timeoutToken
  const name = req.params.device

  eventToken = device.once(`update:${name}`, value => {
    clearTimeout(timeoutToken)
    res.send(value)
  })

  timeoutToken = setTimeout(() => {
    eventToken.cancel()
    device.status(name)
      .then(value => res.send(value))
      .catch(next)
  }, 10000)
})

app.get('/:device.json', (req, res, next) => device.logs(req.params.device)
  .then(logs => res.json(logs))
  .catch(next))

app.get('/:device', (req, res, next) => device.info(req.params.device)
  .then(device => res.render('device', {device}))
  .catch(next))

app.post('/:device', (req, res, next) => {
  const name = req.params.device
  const {code, resetOnFetchStatus} = req.body

  device.updateSettings(name, code, resetOnFetchStatus === 'on')
    .then(() => res.redirect(`/${name}`))
    .catch(next)
})

app.get('/:device/on', (req, res, next) => device.setStatus(req.params.device, '100')
  .then(() => res.send('ok'))
  .catch(next))

app.get('/:device/off', (req, res, next) => device.setStatus(req.params.device, '0')
  .then(() => res.send('ok'))
  .catch(next))

app.get('/:device/:value', (req, res, next) => device
  .setStatus(req.params.device, String(parseInt(req.params.value, 10) || '0'))
  .then(() => res.send('ok'))
  .catch(next))

module.exports = new Promise((resolve, reject) => {
  let server = app.listen(process.env.PORT || 3000, process.env.HOST || '0.0.0.0')

  server.once('listening', () => {
    const {address, port} = server.address()
    console.log('app listening at http://%s:%s', address, port)
    resolve(server)
  })

  server.once('error', err => {
    reject(err)
  })
})

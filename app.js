'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')

const devices = require('./models/devices')
const tokens = require('./models/tokens')

const app = express()

if (!process.env.TEST) {
  app.use(morgan('dev'))
}
app.use(express.static('public'))

app.set('view engine', 'pug')
app.enable('view cache')

app.use(bodyParser.urlencoded({extended: true}))

app.get('/', (req, res, next) => Promise.all([devices.list(), tokens.list()])
  .then(([devices, tokens]) => {
    const host = `${req.protocol}://${req.get('host')}`
    res.render('index', {host, devices, tokens})
  })
  .catch(next))

app.get('/:device/status', (req, res, next) => devices.status(req.params.device)
  .then(value => res.send(value))
  .catch(next))

app.get('/:device/status/polling', (req, res, next) => {
  let eventToken
  let timeoutToken
  const name = req.params.device

  eventToken = devices.once(`update:${name}`, value => {
    clearTimeout(timeoutToken)
    res.send(value)
  })

  timeoutToken = setTimeout(() => {
    eventToken.cancel()
    devices.status(name)
      .then(value => res.send(value))
      .catch(next)
  }, 10000)
})

app.get('/:device.json', (req, res, next) => devices.logs(req.params.device)
  .then(logs => res.json(logs))
  .catch(next))

app.get('/:device', (req, res, next) => devices.info(req.params.device)
  .then(device => res.render('device', {device}))
  .catch(next))

app.post('/:device', (req, res, next) => {
  const name = req.params.device
  const {code, resetOnFetchStatus} = req.body

  devices.updateSettings(name, code, resetOnFetchStatus === 'on')
    .then(() => res.redirect(`/${name}`))
    .catch(next)
})

app.get('/:device/on', (req, res, next) => devices.setStatus(req.params.device, '100')
  .then(() => res.send('ok'))
  .catch(next))

app.get('/:device/off', (req, res, next) => devices.setStatus(req.params.device, '0')
  .then(() => res.send('ok'))
  .catch(next))

app.get('/:device/:value', (req, res, next) => devices
  .setStatus(req.params.device, String(parseInt(req.params.value, 10) || '0'))
  .then(() => res.send('ok'))
  .catch(next))

app.post('/api/tokens/:os/:id', (req, res, next) => tokens
  .update(req.params.os, req.params.id, req.body.token)
  .then(() => res.send('ok'))
  .catch(next))

module.exports = new Promise((resolve, reject) => {
  let server = app.listen(process.env.PORT || 3000, process.env.HOST || '0.0.0.0')

  server.once('listening', () => {
    const {address, port} = server.address()
    if (!process.env.TEST) {
      console.log('app listening at http://%s:%s', address, port)
    }
    resolve(server)
  })

  server.once('error', err => {
    reject(err)
  })
})

'use strict'

const config = require('./config')
const syncer = require('../')
const co = require('co')

co.wrap(syncer.sync)(config.source, config.target, {
  sourcePrefix: '',
  targetPrefix: '',
  ignore: true,
  metas: './metas.json'
})
.then(errors => console.error('%j errored', errors))
.catch(err => console.error(err.stack))

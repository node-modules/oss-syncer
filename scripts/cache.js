'use strict'
const syncer = require('../')
const config = require('./config')
const co = require('co')
const oss = require('ali-oss')
const debug = require('debug')('oss-syncer:cache')

const source = oss(config.source)

co(function * () {
  yield syncer.walk(source, '', function *(meta) {
    const name = meta.name
    try {
      yield source.copy(name, name, {
        headers: {
          'Cache-Control': 'max-age=0, s-maxage=86400'
        }
      })
      debug('add cache header %s ok', name)
    }
    catch (err) {
      debug('add cache header %s error: %s', name, err.message)
      return name
    }
  })
})
.then(errors => console.error('%j errored', errors))
.catch(err => console.error(err.stack))

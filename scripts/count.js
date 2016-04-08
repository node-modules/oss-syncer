'use strict'
const syncer = require('../')
const co = require('co')
const oss = require('ali-oss')
const config = require('./config')

const source = oss(config.source)

co(function * () {
  let num = 0
  yield syncer.walk(source, '', function *(meta) {
    num++
  })
  console.log('total nums: %s', num)
})
.then(errors => console.error('%j errored', errors))
.catch(err => console.error(err.stack))

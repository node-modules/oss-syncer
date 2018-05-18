'use strict'
const debug = require('debug')('oss-syncer:walk')
const gather = require('co-gather')
const sleep = require('mz-modules/sleep')

module.exports = function * walk (source, prefix, fn) {
  let objects = []
  let prefixes = []
  let res = null
  let nextMarker = null
  do {
    res = null
    try {
      res = yield source.list({
        prefix: prefix,
        delimiter: '/',
        'max-keys': 1000,
        marker: nextMarker
      })
    } catch (err) {
      console.error('list prefix:%s, nextMarker:%s error: %s, retry after 5s', prefix, nextMarker, err)
      yield sleep(5000)
    }

    if (res) {
      objects = objects.concat(res.objects || [])
      prefixes = prefixes.concat(res.prefixes || [])
      nextMarker = res.nextMarker
      debug('get next marker %s, %d objects, %d prefixs', nextMarker, objects.length, prefixes.length)
    }

    if (nextMarker) debug('get next marker %s', nextMarker)
  } while (nextMarker)

  debug('parse %s got %s prefixes and %s objects', prefix, prefixes.length, objects.length)

  let tasks = objects.map(function (meta) {
    return fn(meta)
  })

  yield gather(tasks, 20)

  for (let p of prefixes) {
    yield walk(source, p, fn)
  }
}

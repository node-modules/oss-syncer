'use strict'

const debug = require('debug')('oss-syncer')
const gather = require('co-gather')
const oss = require('ali-oss')
const fs = require('fs')

exports.sync = sync

function * sync (source, target, options) {
  source = oss(source)
  target = oss(target)

  options = options || {}
  options.sourcePrefix = options.sourcePrefix || ''
  options.targetPrefix = options.targetPrefix || options.sourcePrefix
  options.force = options.force !== false
  let prefix = options.sourcePrefix
  yield _sync(source, target, options, prefix)
}

function * _sync (source, target, options, prefix) {
  let objects = []
  let prefixes = []
  let res = null
  let nextMarker = null
  do {
    res = yield source.list({
      prefix: prefix,
      delimiter: '/',
      'max-keys': 1000,
      marker: nextMarker
    })

    objects = objects.concat(res.objects || [])
    prefixes = prefixes.concat(res.prefixes || [])
    nextMarker = res.nextMarker
    if (nextMarker) debug('get next marker %s', nextMarker)
  } while (nextMarker)

  debug('parse %s got %s prefixes and %s objects', prefix, prefixes.length, objects.length)

  let tasks = objects.map(function (meta) {
    return checkAndUpload(source, target, meta, options)
  })

  yield gather(tasks, 20)

  for (let p of prefixes) {
    yield _sync(source, target, options, p)
  }
}

function * checkAndUpload (source, target, sourceMeta, options) {
  let targetInfo
  let name = sourceMeta.name
  let targetName = name.replace(options.sourcePrefix, options.targetPrefix)

  if (!options.ignore) {
    try {
      targetInfo = yield target.head(targetName)
    } catch (err) {
      debug('get %s status %s, try to update', targetName, err.status || 'unknown')
    }

    if (!options.force) {
      if (targetInfo && targetInfo.res) {
        return debug('%s is exist, no need to update', targetName)
      }
    } else {
      if (
        targetInfo &&
        targetInfo.res &&
        targetInfo.res.headers &&
        targetInfo.res.headers.etag === sourceMeta.etag) {
        return debug('%s is not modified, no need to update', name)
      }
    }
  }

  try {
    let res = yield source.getStream(name)
    let stream = res.stream
    let length = res.res.headers['content-length']
    if (!length) {
      throw new Error('can not get source object content length')
    }

    yield target.put(targetName, stream, {
      headers: {
        'Content-Length': length
      }
    })
  } catch (err) {
    debug('sync %s error: %s', name, err.message)
    return name
  }

  debug('sync %s ok', name)
}

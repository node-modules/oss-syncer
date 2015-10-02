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

  let sourceMetas
  if (options.metas) {
    sourceMetas = require(options.metas)
  } else {
    try {
      sourceMetas = yield getAllObjects(source, options.sourcePrefix)
    } catch (err) {
      debug('get source metas error %s', err.message)
      throw err
    }
    debug('get %s objects in source', sourceMetas.length)
    fs.writeFileSync('all_metas.json', JSON.stringify(sourceMetas))
    debug('backup all_metas.json')
  }

  let tasks = sourceMetas.map(function (meta) {
    return checkAndUpload(source, target, meta, options)
  })

  let errors = yield gather(tasks, 20)
  debug('all objects updated!')
  return errors.map(function (res) {
    return res.value
  }).filter(function (v) {
    return v
  })
}

function * getAllObjects (source, prefix) {
  let metas = []
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
  } while (nextMarker)

  metas = metas.concat(res.objects || [])
  debug('parse %s got %s prefixes and %s objects', prefix, prefixes.length, objects.length)

  for (let p of prefixes) {
    let subMetas = yield getAllObjects(source, p)
    metas = metas.concat(subMetas)
  }
  return metas
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
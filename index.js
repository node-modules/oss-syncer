'use strict'

const debug = require('debug')('oss-syncer')
const oss = require('ali-oss')

exports.sync = sync

function * sync (source, target, prefix) {
  source = oss(source)
  target = oss(target)
  prefix = prefix || ''
  let sourceMetas

  try {
    sourceMetas = yield getAllObjects(source, prefix)
  } catch (err) {
    debug('get source metas error %s', err.message)
    throw err
  }
  debug('get %s objects in source', sourceMetas.length)

  var errors = []
  for (let meta of sourceMetas) {
    var errorName = yield checkAndUpload(source, target, meta)
    errorName && errors.push(errorName)
  }
  debug('all objects updated!')
  return errors
}

function * getAllObjects (source, prefix) {
  let metas = []
  let res = yield source.list({
    prefix: prefix,
    delimiter: '/',
    'max-keys': 1000
  })
  let objects = res.objects || []
  let prefixes = res.prefixes || []
  metas = metas.concat(res.objects || [])
  debug('parse %s got %s prefixes and %s objects', prefix, prefixes.length, objects.length)

  for (let p of prefixes) {
    let subMetas = yield getAllObjects(source, p)
    metas = metas.concat(subMetas)
  }
  return metas
}

function * checkAndUpload (source, target, sourceMeta) {
  let targetInfo
  let name = sourceMeta.name
  try {
    targetInfo = yield target.head(name)
  } catch (err) {
    debug('get %s status %s, try to update', name, err.status || 'unknown')
  }

  if (targetInfo.res &&
    targetInfo.res.headers &&
    targetInfo.res.headers.etag === sourceMeta.etag) {
    return debug('%s is not modified, no need to update', name)
  }
  try {
    let res = yield source.getStream(name)
    let stream = res.stream
    let length = res.res.headers['content-length']
    if (!length) {
      throw new Error('can not get source object content length')
    }

    yield target.put(name, stream, {
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

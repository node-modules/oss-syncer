'use strict'

const debug = require('debug')('oss-syncer')
const oss = require('ali-oss')
const walk = require('./walk')
const only = require('only')

exports.sync = sync
exports.walk = walk

function * sync (source, target, options) {
  source = oss(source)
  target = oss(target)

  options = options || {}
  options.sourcePrefix = options.sourcePrefix || ''
  options.targetPrefix = options.targetPrefix || options.sourcePrefix
  options.force = options.force !== false
  options.keepHeaders = options.keepHeaders || []
  yield walk(source, options.sourcePrefix, function * (meta) {
    return yield checkAndUpload(source, target, meta, options)
  })
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

  let length;
  try {
    let res = yield source.getStream(name)
    let stream = res.stream
    length = res.res.headers['content-length']
    if (!length) {
      throw new Error('can not get source object content length')
    }

    const headers = Object.assign({
      'content-length': length
    }, only(res.res.headers, options.keepHeaders))

    debug('syncing %s => %s, headers: %j', name, targetName, headers);
    yield target.put(targetName, stream, { headers })
    if (options.acl) {
      res = yield source.getACL(name)
      if (res.acl !== 'default') yield target.putACL(targetName, res.acl)
    }
  } catch (err) {
    debug('sync %s error: %s', name, err.message)
    return name
  }

  debug('sync %s ok, length: %s', name, length)
}

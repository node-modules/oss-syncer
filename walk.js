'use strict'

module.exports = function * (source, prefix, fn) {
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
    return fn(meta)
  })

  yield gather(tasks, 20)

  for (let p of prefixes) {
    yield _sync(source, p, fn)
  }
}

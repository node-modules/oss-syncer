oss-syncer
---------------

同步不同的 oss bucket。

## Installation

```bash
$ npm install oss-syncer
```

## Usage

```js
'use strict'

const co = require('co')
const syncer = require('oss-syncer')

// see https://github.com/ali-sdk/ali-oss
const sourceConfig = {}
const targetConfig = {}
const options = {
  sourcePrefix: 'release/',
  targetPrefix: 'prepub/',
  force: true, // 默认为 true，为 true 时如果两者不同则用 source 覆盖 target，为 false 时不覆盖
  ignore: false, // 默认为 false，为 true 时不检查是否相同，直接覆盖，否则去做检查，一般用于第一次同步
  keepHeaders: ['cache-control'], // 需要保留的 oss header，默认为空数组（不保留），必须为全小写
}
co(syncer.sync(sourceConfig, targetConfig, options)).catch(err => console.error(err.stack))
```

如果需要查看同步记录，请加 `DEBUG=oss-syncer` 环境变量运行。

### walk

`oss-syncer` 单独提供一个 `walk` 方法，可以遍历整个 oss bucket 来进行想要的操作。

```js
'use strict'
const syncer = require('oss-syncer')
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
.catch(err => console.error(err.stack))
```

### License

MIT

oss-syncer
---------------

synchronization all files from this bucket to another bucket.

## Installation

```bash
$ npm install oss-syncer
```

## Usage

```js

let syncer = require('oss-syncer')

// see https://github.com/ali-sdk/ali-oss
let sourceConfig = {}
let targetConfig = {}
let options = {
  sourcePrefix: 'release/',
  targetPrefix: 'prepub/',
  force: true, // 默认为 true，为 true 时如果两者不同则用 source 覆盖 target，为 false 时不覆盖
  ignore: false, // 默认为 false，为 true 时不检查是否相同，直接覆盖，否则去做检查，一般用于第一次同步
}
co(syncer.sync(sourceConfig, targetConfig, options)).then(function (keys) {
  conosle.error('%j sync error', keys)
}).catch(onerror)
```

### License

MIT

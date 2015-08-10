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
  force: false // default is true
}
co(syncer.sync(sourceConfig, targetConfig, options)).then(function (keys) {
  conosle.error('%j sync error', keys)
}).catch(onerror)
```

### License

MIT

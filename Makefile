TESTS =  $(shell ls -S `find test -type f -name "*.test.js" -print`)
REPORTER = tap
TIMEOUT = 3000
MOCHA_OPTS =

standard:
	@./node_modules/.bin/standard

install:
	@npm install --registry=http://registry.npm.taobao.org

test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha --harmony \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		--require should \
		$(MOCHA_OPTS) \
		$(TESTS)

test-cov:
	@NODE_ENV=test node --harmony \
		node_modules/.bin/istanbul cover \
		./node_modules/.bin/_mocha \
		-- -u exports \
		--require should \
		$(TESTS) \
		--bail

test-travis:
	@NODE_ENV=test node --harmony \
		node_modules/.bin/istanbul cover \
		./node_modules/.bin/_mocha \
		--report lcovonly \
		-- -u exports \
		--require should \
		$(TESTS) \
		--bail

autod: install
	@node_modules/.bin/autod -w --prefix="~" \
  -D mocha,istanbul-harmony,should,standard \
	-t test.js
	@$(MAKE) install

.PHONY: test

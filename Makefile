.PHONY: browser build validate smoke run fetch new test-adaptive

build:
	node scripts/build.mjs

validate: build
	node scripts/validate-atlas.mjs

smoke: validate
	node scripts/check.mjs
	node scripts/test-all.mjs

test-adaptive:
	node --test adaptive-interface/tests/*.test.mjs

run: build
	node scripts/serve.mjs

fetch:
	node scripts/fetch.mjs
	$(MAKE) smoke

new:
	node scripts/new-solution.mjs $(name) "$(title)"

browser: build
	node scripts/browser-acceptance.mjs

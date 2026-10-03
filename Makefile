.PHONY: build validate smoke run fetch new

build:
	node scripts/build.mjs

validate: build
	node scripts/validate-atlas.mjs

smoke: validate
	node scripts/check.mjs

run: build
	node scripts/serve.mjs

fetch:
	node scripts/fetch.mjs
	$(MAKE) smoke

new:
	node scripts/new-solution.mjs $(name) "$(title)"

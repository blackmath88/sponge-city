.PHONY: build validate smoke run fetch

build:
	node scripts/build-atlas.mjs

validate: build
	node scripts/validate-atlas.mjs

smoke: validate
	node scripts/smoke-atlas.mjs
	node scripts/smoke-map.mjs

run: build
	node scripts/serve-atlas.mjs

fetch:
	node scripts/fetch-basel-data.mjs
	$(MAKE) smoke

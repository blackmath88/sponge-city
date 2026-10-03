.PHONY: build validate smoke run

build:
	node scripts/build-atlas.mjs

validate: build
	node scripts/validate-atlas.mjs

smoke: validate
	node scripts/smoke-atlas.mjs

run: build
	node scripts/serve-atlas.mjs

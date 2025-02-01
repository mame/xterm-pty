OUTPUTS := \
	classic-asyncify-dist \
	classic-worker-dist \
	module-asyncify-dist \
	module-worker-dist \
	vite-example-dist \
	echo/echo.js \
	signals/signals.js

all: $(OUTPUTS)

TESTS_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
EMSCRIPTEN_PTY=$(TESTS_DIR)/../emscripten-pty.js
ASYNCIFY_OPTIONS=-s FORCE_FILESYSTEM -s ASYNCIFY --js-library=$(EMSCRIPTEN_PTY)
WORKER_OPTIONS=-s FORCE_FILESYSTEM -s PROXY_TO_PTHREAD -s EXIT_RUNTIME -pthread --js-library=$(EMSCRIPTEN_PTY)

CLASSIC_EXAMPLE := $(shell find ../examples/classic-example -type f)
MODULE_EXAMPLE := $(shell find ../examples/module-example -type f)
VITE_EXAMPLE := $(shell find ../examples/vite-example -type f)

define generate
$1: $4
	mkdir -p $1
	sed 's|https://unpkg.com/xterm-pty/|/root/|;s|https://unpkg.com/|/root/node_modules/|' < $(filter %.html, $4) > $1/index.html
	emcc $3 -o $1/hello.$2 $(filter %.c, $4)
endef

$(eval $(call generate,classic-asyncify-dist,js,$(ASYNCIFY_OPTIONS),$(CLASSIC_EXAMPLE)))
$(eval $(call generate,classic-worker-dist,js,$(WORKER_OPTIONS),$(CLASSIC_EXAMPLE)))
$(eval $(call generate,module-asyncify-dist,mjs,$(ASYNCIFY_OPTIONS),$(MODULE_EXAMPLE)))
$(eval $(call generate,module-worker-dist,mjs,$(WORKER_OPTIONS),$(MODULE_EXAMPLE)))

vite-example-dist: $(VITE_EXAMPLE)
	cd ../examples/vite-example && npm ci && npm run build:emcc:asyncify && npm run build -- --base ./ --outDir ../../tests/$@ --emptyOutDir

echo/echo.js: echo/echo.c 
	emcc $(ASYNCIFY_OPTIONS) -o $@ $<

signals/signals.js: signals/signals.c 
	emcc $(ASYNCIFY_OPTIONS) -o $@ $<

clean:
	rm -rf $(OUTPUTS)
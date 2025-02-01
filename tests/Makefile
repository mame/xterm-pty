all: \
	hello/hello.asyncify.js \
	hello/hello.asyncify.mjs \
	hello/hello.worker.js \
	hello/hello.worker.mjs \
	echo/echo.js \
	signals/signals.js

EMSCRIPTEN_PTY=../emscripten-pty.js
ASYNCIFY_OPTIONS=-s FORCE_FILESYSTEM=1 -s ASYNCIFY --js-library=$(EMSCRIPTEN_PTY)
WORKER_OPTIONS=-s FORCE_FILESYSTEM=1 -s PROXY_TO_PTHREAD -s EXIT_RUNTIME=1 -pthread --js-library=$(EMSCRIPTEN_PTY)

hello.asyncify.%: hello/hello.c 
	emcc $(ASYNCIFY_OPTIONS) -o $@ $<

hello.worker.%: hello/hello.c 
	emcc $(WORKER_OPTIONS) -o $@ $<

echo/echo.js: echo/echo.c 
	emcc $(ASYNCIFY_OPTIONS) -o $@ $<

signals/signals.js: signals/signals.c 
	emcc $(ASYNCIFY_OPTIONS) -o $@ $<

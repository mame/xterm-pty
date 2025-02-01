# xterm-pty emscripten example (ESM)

## Asyncify mode (easy)

```
emcc -s FORCE_FILESYSTEM -s ASYNCIFY --js-library=../../emscripten-pty.js -o hello.mjs hello.c
npx http-server -p 3000
```

## PTHREAD_TO_PROXY mode

```
wget https://unpkg.com/@xterm/xterm/css/xterm.css
wget https://unpkg.com/@xterm/xterm/lib/xterm.js
wget https://unpkg.com/xterm-pty/index.js
sed -i 's@https://unpkg.com/.*\(lib\|css\|pty\)/@@' index.html 
emcc -s FORCE_FILESYSTEM -s PROXY_TO_PTHREAD -s EXIT_RUNTIME -pthread --js-library=../../emscripten-pty.js -o hello.mjs hello.c
npx statikk -p 3000 --coi
```
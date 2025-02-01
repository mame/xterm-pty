# xterm-pty emscripten example (Vite)

This is a minimal example of a Vite project using xterm-pty and emscripten.

## Asyncify mode

```
npm install
npm run build:emcc:asyncify
npx vite
```

## PTHREAD_TO_PROXY mode

```
npm install
npm run build:emcc:worker
npx vite
```
# Changelog

## 0.13.0 (2026-11-21)

- Support Emscripten 7 (#58).
- Support the poll API of Emscripten 6.0 and later (#59).
  - poll/select now return as soon as input arrives. Previously they slept until the timeout, so e.g. vim took 4 seconds to react to each key.
  - A signal handler now interrupts poll/select with EINTR, so e.g. vim redraws on resize.
- On older Emscripten (e.g. 3.1.69), poll/select now honor their timeout (#61).
- Support flow control (C-s/C-q) in poll/select and read (#62).
  - poll/select can wait for the terminal to become writable.
  - In non-canonical mode, C-s/C-q no longer make `read()` return EOF.
- On Emscripten 5.x, a signal handler now interrupts poll/select with EINTR, and poll/select can wait for the terminal to become writable (#63).
- Support xterm.js 6. `@xterm/xterm` is now `^5.5.0 || ^6.0.0` (#60).

## 0.12.0 (2026-04-07)

- Support Emscripten 5.x (#57).
- Throw `Error` objects instead of strings.

## 0.11.1 (2025-02-01)

- Ship both a UMD build (`index.js`) and an ESM build (`index.mjs`).

## 0.11.0 (2025-02-01)

- Support ESM and CommonJS, and ship TypeScript types (#38).
- Fix compatibility with Next.js and other server-side rendering (#39).
- Fix EOF not being reported properly (#48).
- Interrupt blocking calls with EINTR only when a signal handler is called (#44).
- Remove `TtyClient`, `TtyServer` and `TtyRequest`, which were superseded by `emscripten-pty.js` in 0.10.0.
- Build with tsup instead of webpack.

## 0.10.2 (2024-06-13)

- Fix the handling of Tab in line editing (#37).

## 0.10.1 (2024-01-31)

- `read()` now returns EINTR when a signal is received.
- Fix a missing dependency (`malloc`) in PROXY_TO_PTHREAD builds (#32).

## 0.10.0 (2024-01-27)

- Rewrite the Emscripten integration as a JS library, `emscripten-pty.js`, which you pass to `emcc --js-library` (#10).
  - It supports both `-s ASYNCIFY` (on the main thread) and `-s PROXY_TO_PTHREAD` (in a worker).
  - It replaces `workerTools.js`, `TtyClient` and `TtyServer`.
- Forward signals: e.g. C-c terminates the program, and resizing the terminal sends SIGWINCH (#27).
- select now returns EINTR on signals, and 0 on timeout (#28).
- Performance improvements.

## 0.9.6 (2023-08-06)

- Support Emscripten 3.1.42.

## 0.9.5 (2023-05-31)

- Support Emscripten 3.1.39 (#7).

## 0.9.4 (2022-10-12)

- Support Emscripten 3.1.23, and fix the read syscall.

## 0.9.3 (2022-09-30)

- Move the hack that flushes the output from `TtyServer` to the Emscripten helper (#2).

## 0.9.2 (2022-02-20)

- Ship type declarations and source maps.

## 0.9.1 (2022-02-18)

- Fix the files included in the package.

## 0.9.0 (2022-02-18)

- Initial release.

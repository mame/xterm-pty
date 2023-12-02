#!/bin/bash

set -ex

FILE=sl-5.02.tar.gz
DIR=sl-5.02

if [ ! -e $FILE ]; then
  wget https://github.com/mtoyoda/sl/archive/refs/tags/5.02.tar.gz -O $FILE
fi

if [ ! -e $DIR ]; then
  tar xf $FILE
fi

tar xzf $FILE
emcc \
  -Os \
  -s ASYNCIFY \
  -s EXPORT_ES6 \
  -s ENVIRONMENT=web \
  --js-library ../../emscripten-pty.js \
  -s FORCE_FILESYSTEM \
  --pre-js ../static/ncurses.fs.js \
  -o ../static/sl-core.js \
  $DIR/sl.c \
  -Incurses-6.3/usr/local/include \
  -Incurses-6.3/usr/local/include/ncurses \
  -Lncurses-6.3/usr/local/lib \
  -lncurses \
  -ltinfo

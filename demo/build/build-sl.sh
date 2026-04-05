#!/bin/bash

set -ex

mkdir -p downloads
FILE=downloads/sl-5.02.tar.gz
DIR=sl-5.02

if [ ! -e $FILE ]; then
  wget -O $FILE https://github.com/mtoyoda/sl/archive/refs/tags/5.02.tar.gz
fi

rm -rf $DIR
tar xf $FILE
emcc \
  -Os \
  -pthread \
  -s PROXY_TO_PTHREAD \
  -s EXPORT_ES6 \
  -s ENVIRONMENT=web,worker \
  --js-library ../../emscripten-pty.js \
  -s FORCE_FILESYSTEM \
  --pre-js ../static/ncurses.fs.js \
  -o ../static/sl-core.js \
  $DIR/sl.c \
  -Incurses-6.4/usr/local/include \
  -Incurses-6.4/usr/local/include/ncurses \
  -Lncurses-6.4/usr/local/lib \
  -lncurses \
  -ltinfo

sh worker-options-hack.sh ../static/sl-core.js
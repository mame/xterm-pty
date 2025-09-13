#!/bin/bash

set -ex

FILE=ncurses-6.4.tar.gz
DIR=ncurses-6.4

if [ ! -e $FILE ]; then
  wget https://invisible-mirror.net/archives/ncurses/$FILE
fi

if [ ! -e $DIR ]; then
  tar xf $FILE
fi

tar xf $FILE
cd $DIR
emconfigure ./configure --build=x86_64-linux-gnu --host=wasm32-unknown-emscripten \
  --with-install-prefix=$PWD \
  --without-ada \
  --without-manpages \
  --without-progs \
  --without-tests \
  --with-termlib
make install -j`nproc`

$(em-config EMSCRIPTEN_ROOT)/tools/file_packager \
  ../../static/ncurses.fs.data \
  --js-output=../../static/ncurses.fs.js \
  --preload usr/local/share/terminfo/x/xterm-256color@/usr/local/share/terminfo/x/xterm-256color

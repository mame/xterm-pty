#!/bin/bash

set -ex

mkdir -p downloads
FILE=downloads/ncurses-6.4.tar.gz
DIR=ncurses-6.4

if [ ! -e $FILE ]; then
  wget -O $FILE https://invisible-mirror.net/archives/ncurses/ncurses-6.4.tar.gz
fi

rm -rf $DIR
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

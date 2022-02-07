#!/bin/bash

set -ex

FILE=ncurses-6.3.tar.gz
DIR=ncurses-6.3

if [ ! -e $FILE ]; then
  wget https://invisible-mirror.net/archives/ncurses/$FILE
fi

if [ ! -e $DIR ]; then
  tar xf $FILE
fi

tar xf ncurses-6.3.tar.gz
cd ncurses-6.3
./configure --build x86_64-linux-gnu --host wasm32-unknown-emscripten --disable-stripping --with-install-prefix=$PWD --without-ada -with-termlib \
  CC=emcc CXX=emcc LD=emcc AR=emar RANLIB=emranlib
make install

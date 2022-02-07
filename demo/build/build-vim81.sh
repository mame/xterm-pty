#!/bin/bash

set -ex

FILE=vim-8.1.tar.bz2
DIR=vim81

if [ ! -e $FILE ]; then
  wget ftp://ftp.vim.org/pub/vim/unix/$FILE
fi

if [ ! -e $DIR ]; then
  tar xf $FILE
fi

cd $DIR
./configure --build=x86_64-linux-gnu --host=wasm32-unknown-emscripten --target=wasm32-unknown-emscripten --with-tlib=tinfo --with-vim-name=vim-core \
  CC=emcc CXX=emcc LD=emcc AR=emar RANLIB=emranlib STRIP=true \
  CFLAGS="-Os" \
  LDFLAGS="-Os -sNO_EXIT_RUNTIME=1 -sFORCE_FILESYSTEM=1 -Wno-implicit-function-declaration -L$(dirname $PWD)/ncurses-6.3/usr/local/lib" \
  ac_cv_sizeof_int=4 \
  vim_cv_memmove_handles_overlap=yes \
  vim_cv_stat_ignores_slash=yes \
  vim_cv_tgetent=non-zero \
  vim_cv_terminfo=yes \
  vim_cv_toupper_broken=no \
  vim_cv_tty_group=world \
  vim_cv_getcwd_broken=no
sed -i "/HAVE_SYSINFO/d" src/auto/config.h
sed -i "/HAVE_GETRLIMIT/d" src/auto/config.h
sed -i "/HAVE_GETTEXT/d" src/auto/config.h
sed -i "/HAVE_GETPWUID/d" src/auto/config.h
patch -p0 < ../wasm-vim81.patch
make install DESTDIR=$PWD

cp src/vim-core ../../static/vim-core.js
cp src/vim-core.wasm ../../static/vim-core.wasm

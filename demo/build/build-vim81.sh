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

SCRIPT_DIR=$PWD

cd $DIR

CONFIG_LDFLAGS="\
  -Os \
  -s FS_DEBUG \
  -s ASYNCIFY \
  -s EXPORT_ES6 \
  -s ENVIRONMENT=web \
  --js-library $SCRIPT_DIR/../../emscripten-pty.js \
  -Wno-implicit-function-declaration \
  -L$SCRIPT_DIR/ncurses-6.3/usr/local/lib \
"

emconfigure ./configure --host=wasm32-unknown-emscripten \
  --with-tlib=tinfo \
  --with-vim-name=vim-core \
  STRIP=true \
  CFLAGS="-Os" \
  LDFLAGS="$CONFIG_LDFLAGS" \
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
make install DESTDIR=$PWD -j`nproc`
# This is somewhat annoying but we need to get files from /usr/local/share when we link the binary,
# and `install` sometimes builds the binary before they're ready.
# So we need to delete the binary built by the `install` step and build again, now with the embedding.
rm src/vim-core
make -C src vim-core LDFLAGS="\
  $CONFIG_LDFLAGS \
  -s FORCE_FILESYSTEM \
  --pre-js $SCRIPT_DIR/../static/ncurses.fs.js \
  --preload-file $PWD/usr/local/share/vim/vim81@/usr/local/share/vim/vim81 \
  --exclude-file $PWD/usr/local/share/vim/vim81/lang \
  --exclude-file $PWD/usr/local/share/vim/vim81/doc \
  -s EXPORTED_RUNTIME_METHODS=FS \
"

cp src/vim-core.* ../../static/
cp src/vim-core ../../static/vim-core.js

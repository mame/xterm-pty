#!/bin/bash

set -ex

FILE=vim-9.2.0.tar.bz2
DIR=vim-9.2.0

if [ ! -e $FILE ]; then
  wget -O $FILE https://github.com/vim/vim/archive/refs/tags/v9.2.0.tar.gz
fi

if [ ! -e $DIR ]; then
  tar xf $FILE
fi

SCRIPT_DIR=$PWD

cd $DIR

# emconfigure fails its link tests when LDFLAGS contain flags like
# --js-library or -s ASYNCIFY, so pass only the minimum to configure.
EMCONFIGURE_LDFLAGS="\
  -Os \
  -L$SCRIPT_DIR/ncurses-6.4/usr/local/lib \
"

# Full LDFLAGS used for the actual build and link steps.
FULL_LDFLAGS="\
  $EMCONFIGURE_LDFLAGS \
  -s FS_DEBUG \
  -s ASYNCIFY \
  -s EXPORT_ES6 \
  -s ENVIRONMENT=web \
  --js-library $SCRIPT_DIR/../../emscripten-pty.js \
  -Wno-implicit-function-declaration \
"

emconfigure ./configure --host=wasm32-unknown-emscripten \
  --with-tlib=tinfo \
  --with-vim-name=vim-core \
  --disable-xattr \
  STRIP=true \
  CFLAGS="-Os" \
  LDFLAGS="$EMCONFIGURE_LDFLAGS" \
  ac_cv_sizeof_int=4 \
  ac_cv_sizeof_long=4 \
  ac_cv_sizeof_time_t=8 \
  ac_cv_sizeof_off_t=8 \
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
sed -i "/HAVE_TIMER_CREATE/d" src/auto/config.h
make install DESTDIR=$PWD -j`nproc` LDFLAGS="$FULL_LDFLAGS"
# This is somewhat annoying but we need to get files from /usr/local/share when we link the binary,
# and `install` sometimes builds the binary before they're ready.
# So we need to delete the binary built by the `install` step and build again, now with the embedding.
rm src/vim-core
make -C src vim-core LDFLAGS="\
  $FULL_LDFLAGS \
  -s FORCE_FILESYSTEM \
  --pre-js $SCRIPT_DIR/../static/ncurses.fs.js \
  --preload-file $PWD/usr/local/share/vim/vim92@/usr/local/share/vim/vim92 \
  --exclude-file $PWD/usr/local/share/vim/vim92/lang \
  --exclude-file $PWD/usr/local/share/vim/vim92/doc \
  -s EXPORTED_RUNTIME_METHODS=FS \
"

cp src/vim-core.* ../../static/
cp src/vim-core ../../static/vim-core.js

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

tar xzf 5.02.tar.gz
cd sl-5.02
emcc -sNO_EXIT_RUNTIME=0 -sFORCE_FILESYSTEM=1 -o ../../static/sl-core.js sl.c -I$(dirname $PWD)/ncurses-6.3/usr/local/include -I$(dirname $PWD)/ncurses-6.3/usr/local/include/ncurses -L$(dirname $PWD)/ncurses-6.3/usr/local/lib -lncurses -ltinfo

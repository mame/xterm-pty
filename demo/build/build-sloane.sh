#!/bin/bash

set -ex

mkdir -p downloads
FILE=downloads/sloane.c

if [ ! -e $FILE ]; then
  wget -O $FILE https://www.ioccc.org/2006/sloane/sloane.c
fi

emcc \
  -Os \
  -D"main(k,Z)=int main(k,Z)int k;" \
  -include stdio.h \
  -include math.h \
  -s EXPORT_ES6 \
  -s ENVIRONMENT=web,worker \
  --js-library ../../emscripten-pty.js \
  -pthread \
  -s PROXY_TO_PTHREAD \
  -s FORCE_FILESYSTEM \
  -o ../static/sloane-core.js \
  -Wno-implicit-int \
  downloads/sloane.c

sh worker-options-hack.sh ../static/sloane-core.js
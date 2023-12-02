#!/bin/bash

set -ex

FILE=sloane.c

if [ ! -e $FILE ]; then
  wget https://www.ioccc.org/2006/sloane/$FILE
fi

emcc \
  -Os \
  -D"main(k,Z)=int main(int k,char**Z)" \
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
  sloane.c

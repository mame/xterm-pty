#!/bin/bash

set -ex

FILE=sloane.c

if [ ! -e $FILE ]; then
  wget https://www.ioccc.org/2006/sloane/$FILE
fi

emcc -D"main(k,Z)=int main(int k,char**Z)" -include stdio.h -include math.h -sNO_EXIT_RUNTIME=1 -sFORCE_FILESYSTEM=1 -o ../static/sloane-core.js sloane.c

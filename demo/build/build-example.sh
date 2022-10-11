#!/bin/bash

set -ex

emcc -sNO_EXIT_RUNTIME=0 -sFORCE_FILESYSTEM=1 -sRETAIN_COMPILER_SETTINGS -o ../static/example-core.js example.c

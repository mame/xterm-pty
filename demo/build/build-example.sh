#!/bin/bash

set -ex

emcc -sNO_EXIT_RUNTIME=0 -sFORCE_FILESYSTEM=1 -o ../static/example-core.js example.c

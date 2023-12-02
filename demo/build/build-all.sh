#!/bin/bash

set -ex

./build-example.sh
./build-sloane.sh

./build-ncurses.sh

./build-vim90.sh
./build-sl.sh

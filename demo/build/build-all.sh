#!/bin/bash

set -ex

./build-example.sh
./build-sloane.sh

./build-ncurses.sh

./build-vim91.sh
./build-sl.sh

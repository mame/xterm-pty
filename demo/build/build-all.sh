#!/bin/bash

set -ex

bash build-example.sh

bash build-sloane.sh

bash build-ncurses.sh
bash build-vim81.sh
bash build-sl.sh

ruby build-fs.rb
#!/bin/sh
sed -i 's/var workerOptions=\({[^}]*}\);\(worker=new Worker(new URL("[^"]*",import\.meta\.url),\)workerOptions\()\)/\2\1\3/g' $1
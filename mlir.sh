#! /bin/sh

set -e

PATH=/opt/homebrew/Cellar/llvm/17.0.6_1/bin:$PATH
mlir-opt main-opt.mlir --one-shot-bufferize -convert-cf-to-llvm -convert-arith-to-llvm -finalize-memref-to-llvm -cse -canonicalize  -convert-func-to-llvm -reconcile-unrealized-casts | mlir-translate --mlir-to-llvmir | llc -O2

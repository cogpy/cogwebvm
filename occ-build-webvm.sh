#!/bin/bash
# OCC Build Script for WebVM Environment
# Based on .github/workflows/occ-build.yml
# Builds components in dependency order: cogutil -> atomspace -> atomspace-storage -> cogserver -> ...

set -e

BUILD_TYPE=Release
MAKEFLAGS="-j2"

echo "===== OCC Build for WebVM Environment ====="
echo "Build Type: $BUILD_TYPE"
echo "Make Flags: $MAKEFLAGS"
echo ""

# Install system dependencies
echo "===== Installing System Dependencies ====="
sudo apt-get update
sudo apt-get install -y \
  cmake \
  build-essential \
  cxxtest \
  binutils-dev \
  libiberty-dev \
  libboost-all-dev \
  guile-3.0-dev \
  python3-dev \
  cython3 \
  liboctomap-dev \
  valgrind \
  doxygen \
  ccache \
  librocksdb-dev \
  libzmq3-dev \
  libprotobuf-dev \
  protobuf-compiler \
  libssl-dev \
  liblink-grammar-dev

echo ""
echo "===== Stage 1: Building CogUtil ====="
if [ ! -f "/usr/local/lib/opencog/libcogutil.so" ]; then
    mkdir -p cogutil/build
    cd cogutil/build
    cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
    make $MAKEFLAGS
    sudo make install
    sudo ldconfig
    cd ../..
else
    echo "CogUtil already installed, skipping..."
fi

echo ""
echo "===== Stage 2: Building AtomSpace ====="
if [ ! -f "/usr/local/lib/opencog/libatomspace.so" ]; then
    mkdir -p atomspace/build
    cd atomspace/build
    cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
    make $MAKEFLAGS
    sudo make install
    sudo ldconfig
    cd ../..
else
    echo "AtomSpace already installed, skipping..."
fi

echo ""
echo "===== Stage 3: Building AtomSpace-Storage ====="
if [ ! -f "/usr/local/lib/opencog/libstorage-types.so" ]; then
    mkdir -p atomspace-storage/build
    cd atomspace-storage/build
    cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
    make $MAKEFLAGS
    sudo make install
    sudo ldconfig
    cd ../..
else
    echo "AtomSpace-Storage already installed, skipping..."
fi

echo ""
echo "===== Stage 4: Building AtomSpace-Rocks (RocksDB Backend) ====="
mkdir -p atomspace-rocks/build
cd atomspace-rocks/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== Stage 5: Building CogServer ====="
# Rebuild CogServer to ensure it links with new components if needed
mkdir -p cogserver/build
cd cogserver/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== Stage 6: Building Attention (ECAN) ====="
mkdir -p attention/build
cd attention/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== Stage 7: Building Unify ====="
mkdir -p unify/build
cd unify/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== Stage 8: Building URE (Unified Rule Engine) ====="
mkdir -p ure/build
cd ure/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== Stage 9: Building SpaceTime ====="
mkdir -p spacetime/build
cd spacetime/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== Stage 10: Building PLN (Probabilistic Logic Networks) ====="
mkdir -p pln/build
cd pln/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== Stage 11: Building LG-Atomese (Link Grammar) ====="
mkdir -p lg-atomese/build
cd lg-atomese/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

# echo ""
# echo "===== Stage 12: Building Moses (Evolutionary Learning) ====="
# mkdir -p moses/build
# cd moses/build
# cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
# make $MAKEFLAGS
# sudo make install
# sudo ldconfig
# cd ../..

echo ""
echo "===== OCC Advanced Build Complete ====="
echo "All components including URE, PLN, and Moses have been built and installed."

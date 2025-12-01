#!/bin/bash
# OCC Build Script for WebVM Environment
# Based on .github/workflows/occ-build.yml
# Builds components in dependency order: cogutil -> atomspace -> atomspace-storage -> cogserver

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
  ccache

echo ""
echo "===== Stage 1: Building CogUtil ====="
mkdir -p cogutil/build
cd cogutil/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== Stage 2: Building AtomSpace ====="
mkdir -p atomspace/build
cd atomspace/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== Stage 3: Building AtomSpace-Storage ====="
mkdir -p atomspace-storage/build
cd atomspace-storage/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== Stage 4: Building CogServer ====="
mkdir -p cogserver/build
cd cogserver/build
cmake .. -DCMAKE_BUILD_TYPE=$BUILD_TYPE
make $MAKEFLAGS
sudo make install
sudo ldconfig
cd ../..

echo ""
echo "===== OCC Build Complete ====="
echo "Core components (cogutil, atomspace, atomspace-storage, cogserver) have been built and installed."
echo "You can now use OpenCog in your WebVM environment."

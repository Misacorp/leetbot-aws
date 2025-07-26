#!/bin/bash

# Installs dependencies for all Lambda layers in src/layers.

# Loop through each directory in src/layers
for layer in src/layers/*/; do
    # Remove trailing slash from layer path
    layer=${layer%/}

    # Check if nodejs directory exists
    if [ -d "$layer/nodejs" ]; then
        echo "Installing dependencies for $layer..."
        npm install --prefix "$layer/nodejs"
    fi
done
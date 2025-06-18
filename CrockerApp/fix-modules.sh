#!/bin/bash

echo "🔧 Fixing node modules for Mychanic app..."

# Install dependencies if needed
if [ ! -d "node_modules/patch-package" ]; then
  echo "Installing patch-package..."
  npm install --save-dev patch-package postinstall-postinstall
fi

# Apply patches
echo "Applying patches to node modules..."
npx patch-package

# Additional fixes if needed
echo "Fixing additional modules..."

# Make the script executable
chmod +x fix-modules.sh

echo "✅ All modules fixed successfully!"
#!/bin/bash

# Quick start script for QR-Nonsense
# This script will install dependencies if needed and start the dev server

echo "🚀 Starting QR-Nonsense..."

# Check if node_modules exists and has content
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "📦 Installing dependencies..."
  pnpm install
else
  echo "✅ Dependencies already installed"
fi

echo "🌐 Starting development server..."
echo "📍 The app will be available at http://localhost:3000"
echo ""

# Try to start, but catch errors
if ! pnpm start; then
  echo ""
  echo "❌ Failed to start server. This might be a platform mismatch issue."
  echo "🔄 Attempting to fix by reinstalling dependencies..."
  rm -rf node_modules
  pnpm install
  echo "🔄 Retrying server start..."
  pnpm start
fi


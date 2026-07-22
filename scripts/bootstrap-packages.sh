#!/usr/bin/env bash
# Bootstrap packages script for AIavro Billing System v2

set -e

echo "🚀 Bootstrapping packages..."
npm run build -w packages/types
npm run build -w packages/shared
echo "✅ Shared packages built successfully!"

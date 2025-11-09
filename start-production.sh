#!/bin/bash
# Production startup script for FreeMind Vision
# This ensures NODE_ENV is always set correctly for deployment

# Set NODE_ENV to production if not already set
export NODE_ENV="${NODE_ENV:-production}"

# Set PORT to 5000 if not already set
export PORT="${PORT:-5000}"

echo "=== FreeMind Vision Production Start ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "========================================="

# Start the server
exec node dist/index.js

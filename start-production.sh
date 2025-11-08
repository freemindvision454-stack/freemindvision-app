#!/bin/bash
export NODE_ENV=production
export PORT=5000
echo "[PRODUCTION-START] Starting FreeMind Vision in production mode..."
echo "[PRODUCTION-START] NODE_ENV=$NODE_ENV"
echo "[PRODUCTION-START] PORT=$PORT"
node dist/index.js

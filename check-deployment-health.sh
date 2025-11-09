#!/bin/bash

echo "=== Deployment Health Check ==="
echo ""

echo "1. Checking NODE_ENV:"
echo "   NODE_ENV=${NODE_ENV:-not set}"
echo ""

echo "2. Checking PORT:"
echo "   PORT=${PORT:-not set}"
echo ""

echo "3. Checking if dist/ exists:"
if [ -d "dist" ]; then
  echo "   ✓ dist/ directory exists"
  echo "   Contents:"
  ls -lh dist/
else
  echo "   ✗ dist/ directory NOT FOUND"
fi
echo ""

echo "4. Checking if dist/public exists:"
if [ -d "dist/public" ]; then
  echo "   ✓ dist/public/ directory exists"
  echo "   Contents:"
  ls -lh dist/public/ | head -10
else
  echo "   ✗ dist/public/ directory NOT FOUND"
fi
echo ""

echo "5. Checking if dist/index.js exists:"
if [ -f "dist/index.js" ]; then
  echo "   ✓ dist/index.js exists"
  echo "   Size: $(du -h dist/index.js | cut -f1)"
else
  echo "   ✗ dist/index.js NOT FOUND"
fi
echo ""

echo "6. Testing production start (timeout 10s):"
timeout 10s node dist/index.js > /tmp/prod-start.log 2>&1 &
PID=$!
sleep 3

if ps -p $PID > /dev/null; then
  echo "   ✓ Server process started (PID: $PID)"
  
  # Test health endpoint
  echo ""
  echo "7. Testing health endpoint:"
  HEALTH=$(curl -s http://localhost:5000/health 2>&1 || echo "FAILED")
  
  if [[ "$HEALTH" == *"ok"* ]]; then
    echo "   ✓ Health check passed!"
    echo "   Response: $HEALTH"
  else
    echo "   ✗ Health check failed"
    echo "   Response: $HEALTH"
  fi
  
  kill $PID 2>/dev/null
else
  echo "   ✗ Server process failed to start"
fi

echo ""
echo "8. Startup logs:"
if [ -f /tmp/prod-start.log ]; then
  cat /tmp/prod-start.log
else
  echo "   No logs found"
fi

echo ""
echo "=== Check Complete ==="

# Deployment Troubleshooting for Replit

## Current Status
✅ Server starts correctly in production mode (tested manually)  
✅ Health endpoints respond: `/health` and `/api/health`  
✅ Build process completes successfully  
✅ Static files are served from `dist/public`  

## Test Results

### Manual Production Test (Successful)
```bash
NODE_ENV=production PORT=5002 node dist/index.js
```

Output:
```
4:53:17 PM [express] Starting server in production mode...
4:53:17 PM [express] Routes registered successfully
4:53:17 PM [express] Serving static files for production...
4:53:17 PM [express] ✓ Server successfully started on port 5002
4:53:17 PM [express] ✓ Environment: production
4:53:17 PM [express] ✓ Ready to accept connections
```

**Result**: Server starts in < 1 second ✅

### Build Test (Successful)
```bash
npm run build
```

Output:
```
✓ 1736 modules transformed.
../dist/public/index.html                   0.99 kB │ gzip:   0.53 kB
../dist/public/assets/index-CmUgmvoX.css   82.21 kB │ gzip:  13.31 kB
../dist/public/assets/index-VZqK6b9G.js   401.59 kB │ gzip: 120.80 kB
✓ built in 11.14s
```

**Result**: Build completes successfully ✅

## Replit Deployment Configuration

Current `.replit` configuration:
```toml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]

[env]
PORT = "5000"
```

## Possible Issues & Solutions

### Issue 1: NODE_ENV Not Set in Deployment
**Problem**: Replit deployment might not be setting `NODE_ENV=production`

**Solution**: The `npm run start` script already sets it:
```json
"start": "NODE_ENV=production node dist/index.js"
```

✅ **Fixed**: NODE_ENV is automatically set to production by the start script

### Issue 2: Health Check Timeout
**Problem**: Replit might be timing out before server is ready

**Solution**: We've implemented:
1. ✅ Fast server startup (< 1 second)
2. ✅ Health endpoints: `/health` and `/api/health`
3. ✅ Promise-based server.listen() to ensure ready state
4. ✅ `process.send('ready')` signal for deployment platforms

### Issue 3: Missing Static Files
**Problem**: `dist/public/` directory might not exist

**Solution**: Verified build creates the directory:
```
dist/
├── index.js          (server bundle)
└── public/           (client bundle)
    ├── index.html
    └── assets/
```

✅ **Fixed**: Build process creates all necessary files

### Issue 4: Port Binding Issues
**Problem**: Server might not bind to 0.0.0.0

**Solution**: Code explicitly binds to all interfaces:
```typescript
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, ...)
```

✅ **Fixed**: Server listens on 0.0.0.0:5000

## Deployment Checklist

Before deploying to Replit, verify:

### 1. Environment Variables (In Replit Secrets)
- [x] `DATABASE_URL` - PostgreSQL connection
- [x] `SESSION_SECRET` - Session encryption
- [x] `REPL_ID` - Replit app ID (auto-provided)
- [ ] `STRIPE_SECRET_KEY` - Stripe API key (optional for MVP)
- [ ] `VITE_STRIPE_PUBLIC_KEY` - Stripe public key (optional for MVP)

### 2. Build Verification
```bash
npm run build
```
Should output:
- ✅ `dist/index.js` created
- ✅ `dist/public/` directory with assets
- ✅ No build errors

### 3. Production Test
```bash
NODE_ENV=production PORT=5000 node dist/index.js
```
Should show:
- ✅ "Starting server in production mode..."
- ✅ "✓ Server successfully started on port 5000"
- ✅ "✓ Ready to accept connections"

### 4. Health Check Test
```bash
curl http://localhost:5000/health
```
Should return:
```json
{"status":"ok","timestamp":"...","environment":"production"}
```

## Deployment Steps

### Step 1: Verify Build
```bash
npm run build
ls -la dist/
ls -la dist/public/
```

Expected output:
```
dist/index.js (43.7kb)
dist/public/index.html
dist/public/assets/...
```

### Step 2: Test Production Locally
```bash
NODE_ENV=production PORT=5000 node dist/index.js &
sleep 2
curl http://localhost:5000/health
kill %1
```

Expected: `{"status":"ok",...}`

### Step 3: Click "Deploy" in Replit
1. Go to Replit project
2. Click "Deploy" or "Publish" button
3. Wait for build process (2-3 minutes)
4. Check deployment logs for errors

### Step 4: Verify Deployment
Visit your deployed URL:
- `/health` - Should return JSON status
- `/` - Should show landing page
- `/feed` - Should redirect to login

## Common Deployment Errors

### Error: "Application failed to initialize after 2 minutes"

**Cause**: Server not responding to health checks

**Debug Steps**:
1. Check deployment logs in Replit
2. Verify `npm run start` completes without errors
3. Ensure port 5000 is not blocked
4. Check that `dist/index.js` exists after build

**Solutions**:
- ✅ Already implemented: Fast startup with explicit ready signal
- ✅ Already implemented: Comprehensive error logging
- ✅ Already implemented: Promise-based server.listen()

### Error: "Cannot find module"

**Cause**: Missing dependencies in production build

**Solution**:
```bash
npm run build  # Rebuilds with all dependencies
```

### Error: "Static files not loading"

**Cause**: `dist/public/` directory missing or incorrect

**Solution**:
1. Verify build completed: `ls dist/public/`
2. Rebuild if necessary: `npm run build`
3. Check `vite.config.ts` build.outDir setting

## Advanced Debugging

### View Production Logs
After deployment, check Replit deployment logs:
- Look for "Starting server in production mode..."
- Look for "✓ Ready to accept connections"
- Check for any ERROR messages

### Test with curl
```bash
# Health check
curl https://your-app.replit.app/health

# API health
curl https://your-app.replit.app/api/health

# Landing page (should return HTML)
curl https://your-app.replit.app/
```

### Verify Build Artifacts
```bash
# Check server bundle
file dist/index.js
# Should output: JavaScript source

# Check client bundle
ls -lh dist/public/assets/
# Should show CSS and JS files
```

## Production Environment Variables

These are automatically available in Replit deployment:
- `PORT` - Set to 5000 (configured in .replit)
- `DATABASE_URL` - PostgreSQL connection (from Replit DB)
- `SESSION_SECRET` - Session encryption (from Secrets)
- `REPL_ID` - Replit app identifier (auto-provided)
- `ISSUER_URL` - OAuth issuer (defaults to Replit Auth)

## Performance Optimization

Current startup time: **< 1 second** ✅

Optimizations applied:
1. ✅ Promise-based async server.listen()
2. ✅ Early error detection and exit
3. ✅ Minimal dependencies in production bundle
4. ✅ Static file serving from dist/public
5. ✅ Health endpoints respond immediately

## Next Steps After Successful Deployment

1. **Configure Stripe** (if not done):
   - Add `STRIPE_SECRET_KEY` to Replit Secrets
   - Add `VITE_STRIPE_PUBLIC_KEY` to Replit Secrets
   - Rebuild and redeploy

2. **Test Core Features**:
   - [ ] User registration/login
   - [ ] Video upload
   - [ ] Video feed playback
   - [ ] Follow/unfollow creators
   - [ ] Credit purchase (with Stripe)
   - [ ] Gift sending
   - [ ] Creator dashboard

3. **Monitor Performance**:
   - Check deployment logs daily
   - Monitor error rates
   - Track health endpoint responses

4. **Enable Real Payments**:
   - Switch to Stripe live keys
   - Configure webhook endpoints
   - Test real payment flow

## Support

If deployment continues to fail:

1. **Check Replit Status**: https://status.replit.com
2. **Review Logs**: Deployment → Logs tab in Replit
3. **Test Locally**: Verify production mode works locally first
4. **Contact Support**: Provide deployment logs and error messages

---

**Last Updated**: November 5, 2025  
**Status**: ✅ All fixes applied, ready for deployment

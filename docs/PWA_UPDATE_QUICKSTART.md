# PWA Update System - Quick Start Guide

## What Was Fixed

Your PWA was breaking after deployments because the service worker continued serving old cached files. Users had to manually reinstall the PWA to get updates.

**Now**: The app automatically detects updates when users return to it and seamlessly reloads with the new version.

## How It Works (Simple Version)

1. You deploy a new version
2. User returns to the PWA (switches tabs, reopens app, etc.)
3. System detects the update within 2-5 seconds
4. Shows brief "Updating..." notification
5. App reloads automatically
6. User sees updated app with "Successfully Updated" message

**Total time**: 3-5 seconds, fully automatic.

## For Developers

### Building for Production

**No changes needed to your workflow!**

Your existing build commands now include automatic versioning:

```bash
# Local build
npm run build:web

# Netlify build (automatic)
npm run build:web:netlify
```

These commands now automatically:
1. Build your Expo web app
2. Copy PWA assets
3. **Generate version.json with build timestamp**
4. **Inject timestamp into service worker**

### Testing Updates Locally

**Quick Test**:
```bash
# 1. Build and serve
npm run build:web
npx serve dist -p 3000

# 2. Install PWA in browser

# 3. Make a code change (add a text component)

# 4. Rebuild (keep server running)
npm run build:web

# 5. Simulate update
node scripts/test-pwa-update.js

# 6. Return to PWA window
# Expected: Update toast → Auto reload → Success message
```

### What Got Added

**New Components**:
- `PWAUpdateNotification.tsx` - Handles automatic update flow
- `usePWAUpdate.ts` - React hook for update management
- `versionCheck.ts` - Version comparison utility
- `updateLogger.ts` - Update event logging

**Enhanced Components**:
- `ServiceWorkerRegistration.tsx` - Added update detection
- `sw.js` - Dynamic cache versioning
- `_layout.tsx` - Integrated update notification

**New Scripts**:
- `generate-version.js` - Creates version.json during build
- `test-pwa-update.js` - Simulates deployment for testing

## For End Users

### What Changes for Users?

**Nothing!** Updates happen automatically:

1. They use the PWA normally
2. When you deploy an update, they see:
   - Brief "Updating Application" message
   - Quick reload (3 seconds)
   - "App Updated Successfully" confirmation
3. They continue using the updated app

### User Benefits

✅ **No manual reinstalls** - Updates happen automatically
✅ **No broken app** - Always get latest version
✅ **Minimal disruption** - 3-5 second update process
✅ **Offline support** - Updates apply when back online
✅ **No data loss** - Form data preserved during updates

## Configuration Options

### Update Timing
Default: Check when user returns to app (focus/visibility change)

Change in `app/_layout.tsx`:
```tsx
<PWAUpdateNotification 
  reloadDelay={3000}        // Time before reload (ms)
  showNotifications={true}  // Show toast messages
/>
```

### Minimum Check Interval
Default: 1 minute between checks

Change in `usePWAUpdate.ts`:
```typescript
const DEFAULT_MIN_CHECK_INTERVAL = 60000; // 1 minute
```

### Periodic Check Interval
Default: 30 minutes while app is open

Change in `ServiceWorkerRegistration.tsx`:
```typescript
const updateInterval = setInterval(() => {
  registration.update();
}, 30 * 60 * 1000); // 30 minutes
```

## Monitoring Updates

### Check Update Status (Browser Console)

```javascript
// View update logs
import { getLogSummary } from './src/utils/updateLogger';
console.log(getLogSummary());

// Output:
// === PWA Update Log Summary ===
// Total Checks: 15
// Successful: 14
// Failed: 1
// Success Rate: 93.3%
// Updates Detected: 3
// Updates Installed: 3
```

### Debug Panel
Add `?pwa-debug=true` to URL to see:
- Service worker status
- Current version info
- Update check history
- Manual update buttons

## Troubleshooting

### Update Not Happening?

**Quick Fix**:
```javascript
// In browser console
window.location.reload();
```

**Deep Fix**:
```javascript
// Clear everything and reload
localStorage.clear();
sessionStorage.clear();
caches.keys().then(names => 
  Promise.all(names.map(n => caches.delete(n)))
).then(() => window.location.reload());
```

### Verify System is Working

```javascript
// Check service worker
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Active:', !!reg.active);
  console.log('SW Waiting:', !!reg.waiting);
});

// Check version
fetch('/version.json').then(r => r.json()).then(v => {
  console.log('Deployed version:', v.buildTime);
});

const running = localStorage.getItem('pwa-running-version');
console.log('Running version:', JSON.parse(running).buildTime);
```

## Deployment Checklist

### Before Deploying

- [ ] Build completes: `npm run build:web`
- [ ] Check `dist/version.json` exists with unique buildTime
- [ ] Check `dist/sw.js` contains build timestamp (not `__BUILD_TIMESTAMP__`)
- [ ] Test locally with `npx serve dist`

### After Deploying

- [ ] Open existing PWA installation
- [ ] Wait 5-10 seconds
- [ ] Verify update toast appears
- [ ] Verify app reloads
- [ ] Verify new content visible
- [ ] Check browser console for errors

### If Issues Occur

1. Check build logs
2. Verify version.json accessible at your-domain.com/version.json
3. Check service worker in DevTools → Application → Service Workers
4. Review browser console for errors
5. Contact support with exported logs: `exportUpdateLogs()`

## Performance Impact

### User Experience
- Update check: < 1 second (happens in background)
- Update installation: 3-5 seconds total
- No perceived lag during normal use
- No impact on app load time

### Technical Metrics
- Network: ~500 bytes for version check
- Storage: ~10-50 KB for update logs
- CPU: Negligible (checks only on focus)
- Battery: Minimal impact

## Key Features

### Automatic Updates
✅ Detects updates when user returns to app
✅ Updates check on app focus/visibility
✅ Periodic checks every 30 minutes
✅ No user action required

### Smart Behavior
✅ Debounces checks (1 minute minimum)
✅ Handles offline gracefully
✅ Prevents update loops
✅ Clears old caches automatically
✅ Preserves app state during update

### Developer Friendly
✅ No build process changes needed
✅ Automatic version generation
✅ Comprehensive logging
✅ Easy to test locally
✅ Debug panel for troubleshooting

## Support

For detailed information, see:
- [Complete System Documentation](./PWA_UPDATE_SYSTEM.md)
- [Troubleshooting](./PWA_TROUBLESHOOTING.md)

## Summary

The PWA update system ensures your users always have the latest version without any manual intervention. Updates happen automatically, quickly, and seamlessly - providing a native app-like experience for your web application.

**No more broken PWAs after deployments!** 🎉

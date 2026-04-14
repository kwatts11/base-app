/**
 * generate-version.js — writes a version.json to dist/ for the app to read
 *
 * Used by the update system (UPDATE_SYSTEM.md) to detect version changes.
 * Run automatically by: npm run build:web
 */

const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(DIST_DIR)) {
  console.warn('[generate-version] dist/ not found — skipping version file generation');
  process.exit(0);
}

const versionData = {
  version: pkg.version,
  buildTime: new Date().toISOString(),
  name: pkg.name,
};

const dest = path.join(DIST_DIR, 'version.json');
fs.writeFileSync(dest, JSON.stringify(versionData, null, 2));
console.log(`[generate-version] ✓ version.json written: ${pkg.version} @ ${versionData.buildTime}`);

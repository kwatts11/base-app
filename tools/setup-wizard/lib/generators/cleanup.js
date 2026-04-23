/**
 * cleanup — remove index-type-specific files that don't apply to this app.
 *
 * - Non-time-indexed apps: drop src/components/time-index/.
 * - Non-location-indexed: drop map/area/area-colors/add-location/useLocations/mapConfig + 005_locations.sql.
 * - Always: remove tools/ from generated project.
 *
 * Also clears related WIZARD blocks from files that survive.
 */
const fs = require('fs');
const path = require('path');
const { removeBlock } = require('../edits/marker-edit');

function applyCleanup(targetDir, formData) {
  const indexType = (formData.tabs || {}).indexType || 'custom';

  if (indexType !== 'time') {
    rmrf(path.join(targetDir, 'src', 'components', 'time-index'));
  }

  if (indexType !== 'location') {
    [
      'src/hooks/useLocations.ts',
      'database/migrations/005_locations.sql',
      'app/(tabs)/map.tsx',
      'app/(tabs)/area.tsx',
      'app/(modal)/area-colors.tsx',
      'app/(modal)/add-location.tsx',
      'src/constants/mapConfig.ts',
    ].forEach(rel => {
      const f = path.join(targetDir, rel);
      if (fs.existsSync(f)) fs.rmSync(f, { force: true });
    });

    // Strip location types & tables from src/types/database.ts
    const dbTypes = path.join(targetDir, 'src', 'types', 'database.ts');
    if (fs.existsSync(dbTypes)) {
      tryRemove(dbTypes, 'location-types');
      tryRemove(dbTypes, 'location-tables');
    }
    // Strip the Area Colors action from admin.tsx
    const admin = path.join(targetDir, 'app', '(tabs)', 'admin.tsx');
    if (fs.existsSync(admin)) tryRemove(admin, 'area-colors-action');

    // Remove location-related plugins + iOS permission strings from app.json so
    // the smoke-test sentinel sweep doesn't catch YOUR_MAPBOX_SECRET_TOKEN.
    stripLocationFromAppJson(path.join(targetDir, 'app.json'));

    // Drop unused mapbox/expo-location deps from package.json so npm install
    // skips a heavy native module the app doesn't use.
    stripLocationFromPackageJson(path.join(targetDir, 'package.json'));
  }

  // Always: remove tools/ from generated project
  rmrf(path.join(targetDir, 'tools'));

  // Always: strip the home setup-card and the setup-banner from _layout.tsx
  const home = path.join(targetDir, 'app', '(tabs)', 'home.tsx');
  if (fs.existsSync(home)) tryRemove(home, 'setup-card');
  const layout = path.join(targetDir, 'app', '(tabs)', '_layout.tsx');
  if (fs.existsSync(layout)) tryRemove(layout, 'setup-banner');
}

function stripLocationFromAppJson(appJson) {
  if (!fs.existsSync(appJson)) return;
  try {
    const obj = JSON.parse(fs.readFileSync(appJson, 'utf8'));
    if (obj.expo) {
      if (Array.isArray(obj.expo.plugins)) {
        obj.expo.plugins = obj.expo.plugins.filter(p => {
          const id = Array.isArray(p) ? p[0] : p;
          return id !== '@rnmapbox/maps' && id !== 'expo-location';
        });
      }
      if (obj.expo.ios && obj.expo.ios.infoPlist) {
        delete obj.expo.ios.infoPlist.NSLocationWhenInUseUsageDescription;
        if (Object.keys(obj.expo.ios.infoPlist).length === 0) delete obj.expo.ios.infoPlist;
      }
    }
    fs.writeFileSync(appJson, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  } catch (err) {
    if (process.env.WIZARD_DEBUG) console.error(`[cleanup] app.json: ${err.message}`);
  }
}

function stripLocationFromPackageJson(pkgPath) {
  if (!fs.existsSync(pkgPath)) return;
  try {
    const obj = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    for (const section of ['dependencies', 'devDependencies']) {
      if (!obj[section]) continue;
      for (const dep of ['@rnmapbox/maps', 'expo-location']) delete obj[section][dep];
    }
    fs.writeFileSync(pkgPath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  } catch (err) {
    if (process.env.WIZARD_DEBUG) console.error(`[cleanup] package.json: ${err.message}`);
  }
}

function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function tryRemove(file, key) {
  try { removeBlock(file, key); }
  catch (err) { if (process.env.WIZARD_DEBUG) console.error(`[cleanup] ${file} (${key}): ${err.message}`); }
}

module.exports = { applyCleanup };

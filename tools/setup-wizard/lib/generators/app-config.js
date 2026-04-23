/**
 * app-config — apply identity + branding to:
 *   - src/constants/appConfig.ts  (string literal replaces)
 *   - app.json                    (JSON path edits)
 *   - public/manifest.json        (JSON path edits)
 */
const fs = require('fs');
const path = require('path');
const { setJsonPaths } = require('../edits/json-edit');

function applyAppConfig(targetDir, formData) {
  const identity = formData.identity || {};
  const branding = formData.branding || {};
  const email = formData.email || {};

  // 1. src/constants/appConfig.ts — replace each property value via regex
  const cfgPath = path.join(targetDir, 'src', 'constants', 'appConfig.ts');
  if (fs.existsSync(cfgPath)) {
    let text = fs.readFileSync(cfgPath, 'utf8');
    text = text
      .replace(/(name:\s*)'[^']*'/, `$1'${escapeSingle(identity.name || '')}'`)
      .replace(/(shortName:\s*)'[^']*'/, `$1'${escapeSingle(identity.slug || identity.name || '')}'`)
      .replace(/(tagline:\s*)'[^']*'/, `$1'${escapeSingle(identity.tagline || '')}'`)
      .replace(/(description:\s*)'[^']*'/, `$1'${escapeSingle(identity.description || '')}'`)
      .replace(/(supportEmail:\s*)'[^']*'/, `$1'${escapeSingle(email.fromAddress || '')}'`);
    // Strip the SETUP TODO marker comments if any
    text = text.replace(/^\s*\/\/\s*TODO:\s*\[BASE-APP SETUP NEEDED\].*\n/gm, '');
    fs.writeFileSync(cfgPath, text, 'utf8');
  }

  // 2. app.json
  const appJsonPath = path.join(targetDir, 'app.json');
  if (fs.existsSync(appJsonPath)) {
    setJsonPaths(appJsonPath, {
      'expo.name': identity.name || '',
      'expo.slug': identity.slug || '',
      'expo.web.name': identity.name || '',
      'expo.web.shortName': identity.slug || '',
      'expo.splash.backgroundColor': branding.background || '#0F1115',
      'expo.web.themeColor': branding.primary || '#4F8EF7',
      'expo.web.backgroundColor': branding.background || '#0F1115',
      'expo.android.adaptiveIcon.backgroundColor': branding.primary || '#4F8EF7',
    });
  }

  // 3. public/manifest.json
  const manifestPath = path.join(targetDir, 'public', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    setJsonPaths(manifestPath, {
      name: identity.name || '',
      short_name: identity.slug || '',
      description: identity.description || '',
      background_color: branding.background || '#0F1115',
      theme_color: branding.primary || '#4F8EF7',
    });
  }
}

function escapeSingle(s) { return String(s).replace(/'/g, "\\'"); }

module.exports = { applyAppConfig };

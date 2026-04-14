/**
 * copy-pwa-assets.js — runs after `expo export` to inject PWA files into dist/
 *
 * Copies:
 *   public/sw.js       → dist/sw.js
 *   public/manifest.json → dist/manifest.json
 *
 * Run automatically by: npm run build:web
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'public');
const DIST_DIR = path.join(__dirname, '..', 'dist');

const FILES = ['sw.js', 'manifest.json'];

if (!fs.existsSync(DIST_DIR)) {
  console.error('[copy-pwa-assets] dist/ directory not found. Run expo export first.');
  process.exit(1);
}

let copied = 0;
FILES.forEach(file => {
  const src = path.join(SOURCE_DIR, file);
  const dest = path.join(DIST_DIR, file);

  if (!fs.existsSync(src)) {
    console.warn(`[copy-pwa-assets] Source not found: ${src} — skipping`);
    return;
  }

  fs.copyFileSync(src, dest);
  console.log(`[copy-pwa-assets] ✓ Copied ${file} → dist/${file}`);
  copied++;
});

console.log(`[copy-pwa-assets] Done. Copied ${copied}/${FILES.length} files.`);

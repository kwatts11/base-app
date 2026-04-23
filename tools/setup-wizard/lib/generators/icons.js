/**
 * icons — write the PNGs the renderer rasterized + the original logo file.
 */
const fs = require('fs');
const path = require('path');

const ICON_NAMES = {
  512: 'icon-512x512.png',
  192: 'icon-192x192.png',
  180: 'apple-touch-icon-180x180.png',
  32:  'favicon-32.png',
};

function applyIcons(targetDir, icons, logo) {
  const dir = path.join(targetDir, 'assets', 'pwa-icons');
  fs.mkdirSync(dir, { recursive: true });
  if (Array.isArray(icons)) {
    for (const { size, data } of icons) {
      const base64 = data.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.join(dir, ICON_NAMES[size] || `icon-${size}.png`), Buffer.from(base64, 'base64'));
    }
  }
  if (logo && logo.data) {
    const ext = logo.name ? path.extname(logo.name) : '.png';
    const base64 = logo.data.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(path.join(dir, `logo${ext}`), Buffer.from(base64, 'base64'));
  }
}

module.exports = { applyIcons };

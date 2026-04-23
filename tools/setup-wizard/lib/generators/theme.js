/**
 * theme — branding colors → body content for theme.ts marker blocks.
 */

function buildThemeColorsBlock(branding) {
  const c = branding || {};
  return [
    `    primary: '${c.primary || '#4F8EF7'}',`,
    `    secondary: '${c.secondary || '#2C3E50'}',`,
    `    accent: '${c.accent || '#E74C3C'}',`,
    `    background: '${c.background || '#0F1115'}',`,
    `    surface: '${c.surface || '#1A1E25'}',`,
  ].join('\n');
}

function buildThemeTextColorsBlock(branding) {
  const c = branding || {};
  return [
    `    text: '${c.textPrimary || '#F0F0F0'}',`,
    `    textSecondary: '${c.textSecondary || '#9AA3B0'}',`,
  ].join('\n');
}

module.exports = { buildThemeColorsBlock, buildThemeTextColorsBlock };

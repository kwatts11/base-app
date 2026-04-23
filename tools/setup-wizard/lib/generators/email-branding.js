/**
 * email-branding — replace tokens in docs/EMAIL_BRANDING.md.
 * Looks for these literal placeholder strings (no {{}} wrapping in source):
 *   APP_NAME, PRIMARY_COLOR, BACKGROUND_COLOR, SUPPORT_EMAIL
 */
const fs = require('fs');
const path = require('path');

function applyEmailBranding(targetDir, formData) {
  const file = path.join(targetDir, 'docs', 'EMAIL_BRANDING.md');
  if (!fs.existsSync(file)) return;

  const identity = formData.identity || {};
  const branding = formData.branding || {};
  const email = formData.email || {};

  let text = fs.readFileSync(file, 'utf8');
  const tokens = {
    APP_NAME: identity.name || '',
    PRIMARY_COLOR: branding.primary || '',
    BACKGROUND_COLOR: branding.background || '',
    SUPPORT_EMAIL: email.fromAddress || '',
  };
  for (const [k, v] of Object.entries(tokens)) {
    if (!v) continue;
    text = text.split(k).join(v);
  }
  fs.writeFileSync(file, text, 'utf8');
}

module.exports = { applyEmailBranding };

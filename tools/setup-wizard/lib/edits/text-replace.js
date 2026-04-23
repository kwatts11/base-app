/**
 * text-replace — token replacement against {{TOKEN}} placeholders.
 * Used by master-prompt rendering and EMAIL_BRANDING.md token swap.
 */
const fs = require('fs');

function fillTokens(template, tokens) {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    return tokens[key] != null ? String(tokens[key]) : '';
  });
}

function fillFile(file, tokens) {
  const text = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, fillTokens(text, tokens), 'utf8');
}

module.exports = { fillTokens, fillFile };

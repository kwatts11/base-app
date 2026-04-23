/**
 * master-prompt — render the slim master-prompt.md from template.
 *
 * The wizard now does ~95% of setup procedurally. Master-prompt only covers:
 *   1. generate_typescript_types via Supabase MCP
 *   2. npm install / npm start
 *   3. Verify SETUP_TODO.md
 */
const fs = require('fs');
const path = require('path');
const { fillTokens } = require('../edits/text-replace');

function applyMasterPrompt(targetDir, formData) {
  const tplPath = path.join(targetDir, 'docs', 'prompts', 'master-prompt-template.md');
  const out = path.join(targetDir, 'master-prompt.md');
  const identity = formData.identity || {};
  const supabase = formData.supabase || {};

  const tokens = {
    APP_NAME: identity.name || '',
    SUPABASE_PROJECT_ID: supabase.projectId || '',
    GENERATED_DATE: new Date().toISOString().split('T')[0],
  };

  if (fs.existsSync(tplPath)) {
    const tpl = fs.readFileSync(tplPath, 'utf8');
    fs.writeFileSync(out, fillTokens(tpl, tokens), 'utf8');
  } else {
    fs.writeFileSync(out, fallback(tokens), 'utf8');
  }
  return out;
}

function fallback({ APP_NAME, SUPABASE_PROJECT_ID }) {
  return `# ${APP_NAME || 'App'} — Final AI setup steps

The Setup Wizard handled file generation, theme/role/enum config, and migration apply.
Three steps remain that need MCP/CLI access:

## 1. Generate TypeScript types

Call \`generate_typescript_types\` MCP with \`project_id: "${SUPABASE_PROJECT_ID}"\`.
Merge the output into \`src/types/database.ts\` — keep the hand-written
\`UserRole\` enum and helper types; replace/extend the \`*Row\` interfaces.

## 2. Install + run

\`\`\`bash
npm install
npm start
\`\`\`

Fix any compile errors that appear.

## 3. Verify SETUP_TODO.md

Open \`SETUP_TODO.md\` in the project root and complete the remaining manual steps
(SMTP setup, first admin invite, deployment).
`;
}

module.exports = { applyMasterPrompt };

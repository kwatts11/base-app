/**
 * cursor-rules — write `.cursor/rules/` Supabase MCP rule files based on data sensitivity.
 * Lifted from main.js with no behavior changes.
 */
const fs = require('fs');
const path = require('path');

function applyCursorRules(targetDir, formData) {
  const isSensitive = (formData.dataModel || {}).dataSensitive === true;
  const projectId = (formData.supabase || {}).projectId || 'YOUR_PROJECT_ID';
  const cursorRulesDir = path.join(targetDir, '.cursor', 'rules');
  fs.mkdirSync(cursorRulesDir, { recursive: true });

  if (isSensitive) {
    fs.writeFileSync(
      path.join(cursorRulesDir, 'supabase-mcp.mdc'),
      buildSensitiveSupabaseMdc(projectId), 'utf8'
    );
    fs.writeFileSync(
      path.join(cursorRulesDir, 'database-access-mode.mdc'),
      buildDatabaseAccessModeMdc(), 'utf8'
    );
  } else {
    // Standard mode: remove sensitive-only schema gen script + db:schema npm script
    const schemaGen = path.join(targetDir, 'scripts', 'generate-schema.mjs');
    if (fs.existsSync(schemaGen)) fs.rmSync(schemaGen, { force: true });
    const pkgPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts && pkg.scripts['db:schema']) {
        delete pkg.scripts['db:schema'];
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      }
    }
  }
}

function buildSensitiveSupabaseMdc(projectId) {
  return `---
description: Supabase MCP tools — schema-only access (sensitive mode)
alwaysApply: true
---

# Supabase MCP — Schema-Only Access

**Project ID:** \`${projectId}\`
**MCP Server Name:** \`user-supabase\`

All MCP tool calls MUST include \`project_id: "${projectId}"\`.

## Allowed
- \`apply_migration\`, \`list_migrations\`, \`list_extensions\`
- \`generate_typescript_types\` (DDL-only, no row data)
- \`get_logs\`, \`get_project_url\`, \`get_publishable_keys\`
- \`list_tables\` for schema inspection only

## Prohibited
- \`execute_sql\` against business/user tables — use \`database/schema.md\` instead
- Reading row data via any MCP tool

Read \`database/schema.md\` first before any DB work. After every migration, run \`npm run db:schema\` and commit the regenerated file.
`;
}

function buildDatabaseAccessModeMdc() {
  return `---
description: Database access mode — sensitive project override
alwaysApply: true
---

# Database Access Mode: SENSITIVE

Primary schema reference: \`database/schema.md\` (replaces \`database_details.md\`).

- NEVER \`execute_sql\` against business/user tables
- ALWAYS read \`database/schema.md\` first
- \`generate_typescript_types\`: ALLOWED (DDL only)
- \`apply_migration\`: ALLOWED (DDL only)

After migrations:
1. \`apply_migration\` via MCP
2. \`npm run db:schema\` to regenerate \`database/schema.md\`
3. Commit
4. \`generate_typescript_types\` to sync TS types
`;
}

module.exports = { applyCursorRules };

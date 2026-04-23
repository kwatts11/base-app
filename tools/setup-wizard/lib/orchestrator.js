/**
 * orchestrator — runs every wizard generator in order and reports per-step
 * progress to the renderer via the `onProgress` callback.
 *
 * Steps: identity/branding → roles → migrations → entity SQL → enum seed →
 * tab screens → time-index defaults → mapbox → cleanup → docs (PRD, master-prompt,
 * email branding, update-system, setup-todo) → cursor rules → marker strip → verify.
 *
 * If `applyDb` fails, we log the failure and continue without DB tables: master-prompt
 * picks up `apply_migration` instructions for the AI to handle. Verify still runs.
 */
const fs = require('fs');
const path = require('path');

const { applyAppConfig } = require('./generators/app-config');
const { applyEnv } = require('./generators/env');
const { applyPRD } = require('./generators/prd');
const { applyCursorRules } = require('./generators/cursor-rules');
const { applyIcons } = require('./generators/icons');
const { applyMapbox } = require('./generators/mapbox-config');
const { applyEmailBranding } = require('./generators/email-branding');
const { applyUpdateSystem } = require('./generators/update-system');
const { applySetupTodo } = require('./generators/setup-todo');
const { applyMasterPrompt } = require('./generators/master-prompt');
const { applyTabScreens, applyAddEntityModal } = require('./generators/tab-screens');
const { applyTimeIndexDefaults } = require('./generators/time-index');
const { applyEnumSeed } = require('./enum-seed-edit');
const { applyCleanup } = require('./generators/cleanup');

const { replaceBlock } = require('./edits/marker-edit');
const { buildThemeColorsBlock, buildThemeTextColorsBlock } = require('./generators/theme');
const { buildRoleLabelsBlock } = require('./generators/role-labels');
const { buildTabConfigBlock, buildPageIdsBlock, buildPageNamesBlock } = require('./generators/tab-config');
const { buildEntityMigration, snake } = require('./generators/entity-sql');

const { applyProjectMigrations } = require('./db/migrate');
const { runChecks } = require('./verify');
const { stripMarkers } = require('./edits/marker-edit');

/** Walk the project, strip wizard markers, skip noise dirs and non-text files. */
function stripAllMarkers(targetDir) {
  walk(targetDir, (filePath) => {
    if (!/\.(ts|tsx|js|jsx|sql|md|json)$/i.test(filePath)) return;
    try { stripMarkers(filePath); } catch { /* file unreadable, skip */ }
  });
}

function slugify(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function walk(dir, fn) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist') continue;
      walk(p, fn);
    } else fn(p);
  }
}

async function generate({ targetDir, formData, icons, logo, onProgress = () => {} }) {
  // Fold user-defined custom tab names into the `selected` list so they pick
  // up TAB_CONFIG entries, page IDs, and a generated screen file (custom.tsx.tpl).
  const customTabs = ((formData.tabs && formData.tabs.custom) || [])
    .map(t => slugify(t.name))
    .filter(Boolean);
  if (customTabs.length) {
    formData.tabs = formData.tabs || {};
    formData.tabs.selected = Array.from(new Set([...(formData.tabs.selected || []), ...customTabs]));
  }

  const steps = [];
  const step = async (id, label, fn) => {
    onProgress({ id, label, status: 'active' });
    try {
      const result = await fn();
      steps.push({ id, status: 'done' });
      onProgress({ id, label, status: 'done', result });
    } catch (err) {
      steps.push({ id, status: 'failed', error: err.message });
      onProgress({ id, label, status: 'failed', error: err.message });
      throw err;
    }
  };

  // 1. PRD + .env + cursor rules (no markers needed)
  await step('prd', 'Write PRD.md', () => applyPRD(targetDir, formData));
  await step('env', 'Write .env', () => applyEnv(targetDir, formData));
  await step('cursor-rules', 'Configure Cursor rules', () => applyCursorRules(targetDir, formData));

  // 2. App identity (appConfig.ts, app.json, manifest.json)
  await step('app-config', 'Apply app identity', () => applyAppConfig(targetDir, formData));

  // 3. Theme (marker-block in theme.ts)
  await step('theme', 'Apply theme colors', () => {
    const themePath = path.join(targetDir, 'src', 'constants', 'theme.ts');
    if (!fs.existsSync(themePath)) return;
    replaceBlock(themePath, 'theme-colors', buildThemeColorsBlock(formData.branding));
    replaceBlock(themePath, 'theme-text-colors', buildThemeTextColorsBlock(formData.branding));
  });

  // 4. Role labels
  await step('roles', 'Apply role labels', () => {
    const f = path.join(targetDir, 'src', 'utils', 'rolePermissions.ts');
    if (!fs.existsSync(f)) return;
    replaceBlock(f, 'role-labels', buildRoleLabelsBlock(formData.roles));
  });

  // 5. Tab config + page IDs
  await step('tab-config', 'Configure TAB_CONFIG and PAGE_IDS', () => {
    const layout = path.join(targetDir, 'app', '(tabs)', '_layout.tsx');
    const version = path.join(targetDir, 'src', 'constants', 'version.ts');
    const selected = (formData.tabs || {}).selected || [];
    if (fs.existsSync(layout)) replaceBlock(layout, 'tab-config', buildTabConfigBlock(selected));
    if (fs.existsSync(version)) {
      replaceBlock(version, 'app-page-ids', buildPageIdsBlock(selected));
      replaceBlock(version, 'app-page-names', buildPageNamesBlock(selected));
    }
  });

  // 6. Enum seed (only updates 002 marker block; insert runs via migrate step)
  await step('enum-seed', 'Update enum seed data', () => applyEnumSeed(targetDir, formData));

  // 7. Entity migration file (if time-indexed)
  if ((formData.tabs || {}).indexType === 'time') {
    await step('entity-sql', 'Generate entity migration', () => {
      const dataModel = formData.dataModel || {};
      const tableName = snake(dataModel.entityPlural || `${dataModel.entitySingular || 'item'}s`);
      const sql = buildEntityMigration(dataModel);
      const dir = path.join(targetDir, 'database', 'migrations');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `004_${tableName}.sql`), sql, 'utf8');
    });

    await step('time-index-defaults', 'Configure time-index defaults', () => applyTimeIndexDefaults(targetDir, formData));
    await step('add-entity-modal', 'Scaffold create-entity modal', () => applyAddEntityModal(targetDir, formData));
  }

  // 8. Mapbox config (location only)
  if ((formData.tabs || {}).indexType === 'location') {
    await step('mapbox', 'Configure Mapbox', () => applyMapbox(targetDir, formData));
  }

  // 9. Tab screens (today/week/month/search/list/reports)
  await step('tab-screens', 'Scaffold tab screens', () => applyTabScreens(targetDir, formData));

  // 10. Cleanup (delete index-type-irrelevant files, strip location types if needed)
  await step('cleanup', 'Remove unused files', () => applyCleanup(targetDir, formData));

  // 11. Docs
  await step('email-branding', 'Apply email branding', () => applyEmailBranding(targetDir, formData));
  await step('update-system', 'Generate UPDATE_SYSTEM.md', () => applyUpdateSystem(targetDir, formData));
  await step('setup-todo', 'Write SETUP_TODO.md', () => applySetupTodo(targetDir, formData));
  await step('master-prompt', 'Render master-prompt.md', () => applyMasterPrompt(targetDir, formData));

  // 12. Icons
  await step('icons', 'Write app icons', () => applyIcons(targetDir, icons, logo));

  // 13. Apply migrations via pg pooler (graceful fallback)
  let migrationsApplied = false;
  const supabase = formData.supabase || {};
  if (supabase.projectId && supabase.dbPassword) {
    try {
      await step('migrate', 'Apply Supabase migrations', async () => {
        const result = await applyProjectMigrations(
          targetDir,
          { projectId: supabase.projectId, dbPassword: supabase.dbPassword, region: supabase.region },
          (msg) => onProgress({ id: 'migrate', label: 'Apply Supabase migrations', status: 'active', detail: msg })
        );
        migrationsApplied = true;
        return result;
      });
    } catch (err) {
      // Fallback noted in master-prompt; orchestrator continues.
      onProgress({ id: 'migrate', label: 'Apply Supabase migrations', status: 'warning',
        message: `Migration apply failed: ${err.message}. AI will run apply_migration instead.` });
    }
  } else {
    onProgress({ id: 'migrate', label: 'Apply Supabase migrations', status: 'skipped',
      message: 'No DB password — AI will run apply_migration via MCP.' });
  }

  // 14. Strip wizard markers from generated project
  await step('marker-strip', 'Strip wizard markers', () => stripAllMarkers(targetDir));

  // 15. Verify
  const verifyResults = await runChecks(
    targetDir,
    formData,
    migrationsApplied
      ? { projectId: supabase.projectId, dbPassword: supabase.dbPassword, region: supabase.region }
      : null
  );
  onProgress({ id: 'verify', label: 'Verify', status: 'done', result: verifyResults });

  return { ok: true, steps, verify: verifyResults, migrationsApplied };
}

module.exports = { generate };
